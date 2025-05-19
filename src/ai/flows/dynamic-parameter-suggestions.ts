// src/ai/flows/dynamic-parameter-suggestions.ts
'use server';

/**
 * @fileOverview Generates suggestions for swarm dynamics parameters.
 *
 * This file exports:
 * - `suggestParameters` - A function that suggests parameter configurations for swarm dynamics.
 * - `ParameterSuggestionInput` - The input type for the suggestParameters function.
 * - `ParameterSuggestionOutput` - The return type for the suggestParameters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParameterSuggestionInputSchema = z.object({
  desiredSwarmBehavior: z
    .string()
    .describe(
      'The desired swarm behavior (e.g., highly cohesive, very dispersed, rapidly changing direction).' ),
  currentParameters: z
    .string()
    .optional()
    .describe(
      'The current swarm parameters as a stringified JSON.  Omit if starting from defaults.'
    ),
});
export type ParameterSuggestionInput = z.infer<typeof ParameterSuggestionInputSchema>;

const ParameterSuggestionOutputSchema = z.object({
  cohesion: z.number().describe('The cohesion parameter for swarm dynamics.'),
  separation: z.number().describe('The separation parameter for swarm dynamics.'),
  alignment: z.number().describe('The alignment parameter for swarm dynamics.'),
});
export type ParameterSuggestionOutput = z.infer<typeof ParameterSuggestionOutputSchema>;

export async function suggestParameters(input: ParameterSuggestionInput): Promise<ParameterSuggestionOutput> {
  return suggestParametersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parameterSuggestionPrompt',
  input: {
    schema: ParameterSuggestionInputSchema,
  },
  output: {
    schema: ParameterSuggestionOutputSchema,
  },
  prompt: `You are an expert in tuning parameters for swarm dynamics simulations.

  The swarm dynamics are controlled by three parameters:
  - cohesion: How strongly the swarm tends to stay together.
  - separation: How strongly the swarm avoids collisions.
  - alignment: How strongly the swarm tends to move in the same direction.

  Given the desired swarm behavior, suggest appropriate values for these parameters.

  Desired swarm behavior: {{{desiredSwarmBehavior}}}
  ${`{{#if currentParameters}}`}
  The current parameters are: {{{currentParameters}}}
  ${`{{/if}}`}

  Return a JSON object with the suggested parameters.
`,
});

const suggestParametersFlow = ai.defineFlow(
  {
    name: 'suggestParametersFlow',
    inputSchema: ParameterSuggestionInputSchema,
    outputSchema: ParameterSuggestionOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (e) {
      console.error('Error in suggestParametersFlow', e);
      throw e;
    }
  }
);
