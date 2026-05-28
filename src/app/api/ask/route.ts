import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runCoralSql, listCatalog, describeTable } from "@/lib/coral";
import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from "@/lib/agent";

const anthropic = new Anthropic({
  apiKey: process.env.MIMO_API_KEY,
  baseURL: process.env.MIMO_BASE_URL,
});

const DEMO_MODE = process.env.DEMO_MODE === "1";
const FIXTURES_DIR = join(process.cwd(), "data", "fixtures");

function loadFixture(prompt: string) {
  if (!DEMO_MODE || !existsSync(FIXTURES_DIR)) return null;
  const files = ["top-grantees-by-tvl.json", "risk-flag.json"];
  for (const file of files) {
    const path = join(FIXTURES_DIR, file);
    if (!existsSync(path)) continue;
    const fixture = JSON.parse(readFileSync(path, "utf-8"));
    if (prompt.toLowerCase().includes(fixture.prompt.toLowerCase().slice(0, 20))) {
      return fixture;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastUserMsg = messages.findLast((m: { role: string }) => m.role === "user");

  // DEMO_MODE: serve cached fixtures if available
  const fixture = lastUserMsg ? loadFixture(lastUserMsg.content) : null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // DEMO_MODE: serve fixture directly
        if (fixture) {
          send({
            type: "sql_result",
            sql: fixture.sql,
            rows: fixture.rows,
            ms: fixture.ms,
            cached: true,
            rowCount: fixture.rowCount,
          });
          send({ type: "text", text: `*[Demo mode — cached result from ${fixture.snapshotAt}]*\n\nShowing ${fixture.rowCount} rows for: "${fixture.prompt}"` });
          send({ type: "done" });
          return;
        }

        let conversation = [...messages];
        let continueLoop = true;

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: "mimo-v2.5-pro",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: TOOL_DEFINITIONS,
            messages: conversation,
          });

          // Stream text content
          const textBlocks = response.content.filter(
            (b) => b.type === "text"
          ) as Anthropic.TextBlock[];
          for (const block of textBlocks) {
            send({ type: "text", text: block.text });
          }

          // Handle tool use
          const toolBlocks = response.content.filter(
            (b) => b.type === "tool_use"
          ) as Anthropic.ToolUseBlock[];

          if (toolBlocks.length === 0) {
            // No tools used, we're done
            continueLoop = false;
            send({ type: "done" });
            break;
          }

          // Add assistant response to conversation
          conversation.push({ role: "assistant", content: response.content });

          // Execute tools and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const tool of toolBlocks) {
            send({
              type: "tool_call",
              tool: tool.name,
              input: tool.input,
            });

            try {
              let result: unknown;

              if (tool.name === "run_coral_sql") {
                const sql = (tool.input as { sql: string }).sql;
                const coralResult = await runCoralSql(sql);
                result = coralResult;
                send({
                  type: "sql_result",
                  sql,
                  rows: coralResult.rows,
                  ms: coralResult.ms,
                  cached: coralResult.cached,
                  rowCount: coralResult.rows.length,
                });
              } else if (tool.name === "list_catalog") {
                result = await listCatalog();
              } else if (tool.name === "describe_table") {
                const { schema, table } = tool.input as {
                  schema: string;
                  table: string;
                };
                result = await describeTable(schema, table);
              } else {
                result = { error: `Unknown tool: ${tool.name}` };
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: JSON.stringify(result),
              });
            } catch (err: unknown) {
              const error = err as { message?: string };
              toolResults.push({
                type: "tool_result",
                tool_use_id: tool.id,
                content: `Error: ${error.message || "Unknown error"}`,
                is_error: true,
              });
              send({
                type: "tool_error",
                tool: tool.name,
                error: error.message || "Unknown error",
              });
            }
          }

          // Add tool results to conversation
          conversation.push({ role: "user", content: toolResults });
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        send({ type: "error", error: error.message || "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
