// src/ai/flows/adjust-height-map.ts
'use server';

/**
 * @fileOverview Adjusts the height map of the 3D map based on swarm density.
 *
 * - adjustHeightMap - A function that adjusts rectangle heights based on swarm density.
 * - AdjustHeightMapInput - The input type for the adjustHeightMap function.
 * - AdjustHeightMapOutput - The return type for the adjustHeightMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustHeightMapInputSchema = z.object({
  swarmDensityData: z
    .array(z.number())
    .describe(
      'An array representing the density of swarm elements at different locations on the map.'
    ),
  currentHeights: z
    .array(z.number())
    .describe('The current heights of the rectangles in the 3D map.'),
  mapWidth: z.number().describe('The width of the 3D map.'),
  mapHeight: z.number().describe('The height of the 3D map.'),
});
export type AdjustHeightMapInput = z.infer<typeof AdjustHeightMapInputSchema>;

const AdjustHeightMapOutputSchema = z.object({
  adjustedHeights: z
    .array(z.number())
    .describe('The adjusted heights of the rectangles in the 3D map.'),
  explanation: z
    .string()
    .describe(
      'Explanation of how the heights were adjusted based on swarm density.'
    ),
});
export type AdjustHeightMapOutput = z.infer<typeof AdjustHeightMapOutputSchema>;

export async function adjustHeightMap(input: AdjustHeightMapInput): Promise<AdjustHeightMapOutput> {
  return adjustHeightMapFlow(input);
}

const adjustHeightMapPrompt = ai.definePrompt({
  name: 'adjustHeightMapPrompt',
  input: {
    schema: AdjustHeightMapInputSchema,
  },
  output: {schema: AdjustHeightMapOutputSchema},
  prompt: `You are an expert in spatial data analysis and visualization. Given the swarm density data and current rectangle heights of a 3D map, adjust the heights to emphasize areas with high swarm density. Provide a clear explanation of your adjustments.

Swarm Density Data: {{{swarmDensityData}}}
Current Heights: {{{currentHeights}}}
Map Width: {{{mapWidth}}}
Map Height: {{{mapHeight}}}

Adjusted Heights: An array of adjusted rectangle heights.
Explanation: Explanation of how the heights were adjusted based on swarm density.

Consider these factors when adjusting the heights:
- Areas with higher swarm density should have proportionally higher rectangles.
- Maintain a smooth transition between height levels to avoid abrupt changes.
- Normalize the height values to fit within a reasonable range.
`,
});

const adjustHeightMapFlow = ai.defineFlow(
  {
    name: 'adjustHeightMapFlow',
    inputSchema: AdjustHeightMapInputSchema,
    outputSchema: AdjustHeightMapOutputSchema,
  },
  async input => {
    const {output} = await adjustHeightMapPrompt(input);
    return output!;
  }
);
