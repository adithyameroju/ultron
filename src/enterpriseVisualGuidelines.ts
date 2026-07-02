import enterpriseVisualGuidelines from './enterprise-visual-guidelines.md?raw';

/** Appended to OpenAI **image** prompts (`buildHeroImagePrompt`, carousel slide heroes). */
export const ENTERPRISE_VISUAL_GUIDELINES_IMAGE_BLOCK = `

--- ACKO Enterprise — visual guidelines (mandatory for this image) ---

${enterpriseVisualGuidelines}
`;

/** Appended to carousel **plan** system messages (`buildCarouselPlanSystem`). */
export const ENTERPRISE_VISUAL_GUIDELINES_CAROUSEL_PLAN_BLOCK = `

--- ACKO Enterprise — visual guidelines (mandatory for visual_direction and composition on every slide) ---

${enterpriseVisualGuidelines}
`;

export { enterpriseVisualGuidelines };
