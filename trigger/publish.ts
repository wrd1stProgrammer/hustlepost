import { publishScheduledPost as runScheduledPublish } from "@/lib/publishing/scheduled";

export type SupportedPlatform = "x" | "threads";

export type ScheduledPublishInput = {
  scheduledPostId: string;
  platform: SupportedPlatform;
  userId?: string;
  accountId?: string;
};

export async function publishScheduledPost(input: ScheduledPublishInput) {
  return runScheduledPublish({
    scheduledPostId: input.scheduledPostId,
    platform: input.platform,
  });
}
