import Anthropic from "@anthropic-ai/sdk";
import { runCoralSql, listCatalog, describeTable } from "@/lib/coral";
import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from "@/lib/agent";

const anthropic = new Anthropic({
  apiKey: process.env.MIMO_API_KEY,
  baseURL: process.env.MIMO_BASE_URL,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
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
