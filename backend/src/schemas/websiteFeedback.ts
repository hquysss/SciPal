import { z } from 'zod';
export const WEBSITE_USABILITY = ['easy', 'okay', 'hard'] as const;
export const WebsiteFeedbackInputSchema = z.object({
  submission_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  usability: z.enum(WEBSITE_USABILITY),
  feedback: z.string().trim().max(500).default(''),
}).strict();
export const WebsiteReviewSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  usability: z.enum(WEBSITE_USABILITY),
  feedback: z.string().max(500),
  created_at: z.string().datetime({ offset: true }),
});
export const WebsiteFeedbackSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  average: z.number().min(1).max(5).nullable(),
  distribution: z.array(z.number().int().nonnegative()).length(5),
});
export const WebsiteFeedbackPageSchema = WebsiteFeedbackSummarySchema.extend({
  page: z.number().int().positive(), page_size: z.literal(10),
  reviews: z.array(WebsiteReviewSchema).max(10),
});
export const PrivateWebsiteReviewSchema = WebsiteReviewSchema.extend({
  sender: z.object({ id: z.string().uuid(), name: z.string().nullable() }).nullable(),
});
export const PrivateWebsiteFeedbackPageSchema = WebsiteFeedbackPageSchema.extend({ reviews: z.array(PrivateWebsiteReviewSchema).max(10) });
export type WebsiteFeedbackInput = z.infer<typeof WebsiteFeedbackInputSchema>;
export type WebsiteReview = z.infer<typeof WebsiteReviewSchema>;
export type WebsiteFeedbackPage = z.infer<typeof WebsiteFeedbackPageSchema>;
export type PrivateWebsiteReview = z.infer<typeof PrivateWebsiteReviewSchema>;
export type PrivateWebsiteFeedbackPage = z.infer<typeof PrivateWebsiteFeedbackPageSchema>;
