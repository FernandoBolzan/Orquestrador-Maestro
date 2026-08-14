"use strict";

class StructuredOutputError extends Error {
  constructor(message) {
    super(message);
    this.name = "StructuredOutputError";
  }
}

function parseRefinementProposal(rawOutput) {
  if (typeof rawOutput !== "string" || rawOutput.trim() === "") {
    throw new StructuredOutputError("Output is empty or not a string.");
  }

  let jsonStr = rawOutput;
  const match = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    jsonStr = match[1];
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new StructuredOutputError("Failed to parse JSON.");
  }

  // Schema validation
  if (parsed && typeof parsed === "object") {
    if (parsed.addRequirements && !Array.isArray(parsed.addRequirements)) {
      throw new StructuredOutputError("addRequirements must be an array.");
    }
    if (parsed.addConstraints && !Array.isArray(parsed.addConstraints)) {
      throw new StructuredOutputError("addConstraints must be an array.");
    }
    if (parsed.detectedUnknowns && !Array.isArray(parsed.detectedUnknowns)) {
      throw new StructuredOutputError("detectedUnknowns must be an array.");
    }

    // Default valid shape
    return {
      updates: parsed.updates || {},
      addRequirements: parsed.addRequirements || [],
      addConstraints: parsed.addConstraints || [],
      detectedUnknowns: parsed.detectedUnknowns || [],
      question: parsed.question || null,
      recommendation: parsed.recommendation || null
    };
  }

  throw new StructuredOutputError("Output is not a valid object.");
}

module.exports = {
  parseRefinementProposal,
  StructuredOutputError
};
