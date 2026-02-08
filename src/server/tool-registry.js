const { z } = require("zod");

function zodToJsonSchema(zodSchema) {
  const shape = zodSchema._def.shape ? zodSchema._def.shape() : {};
  const properties = {};
  const required = [];

  for (const [key, value] of Object.entries(shape)) {
    const fieldSchema = { type: "string" };

    if (value._def.typeName === "ZodNumber") {
      fieldSchema.type = "number";
    } else if (value._def.typeName === "ZodBoolean") {
      fieldSchema.type = "boolean";
    } else if (value._def.typeName === "ZodArray") {
      fieldSchema.type = "array";
      fieldSchema.items = { type: "string" };
    } else if (value._def.typeName === "ZodObject") {
      fieldSchema.type = "object";
    }

    if (value._def.description) {
      fieldSchema.description = value._def.description;
    }

    const isOptional = value.isOptional && value.isOptional();
    if (!isOptional) {
      required.push(key);
    }

    if (value._def.defaultValue !== undefined) {
      fieldSchema.default = value._def.defaultValue();
    }

    properties[key] = fieldSchema;
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function registerTool(mcpServer, tools, title, description, schema, handler, options = {}) {
  const inputSchema = zodToJsonSchema(schema);
  const tag = options.tag || "General";

  if (!tools[tag]) tools[tag] = [];
  tools[tag].push({
    name: title,
    description,
    inputSchema,
  });

  mcpServer.tool(title, description, inputSchema, async (args) => {
    try {
      const validatedArgs = schema.parse(args);
      return await handler(validatedArgs);
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });
}

module.exports = { zodToJsonSchema, registerTool };
