import { task } from "@trigger.dev/sdk";
import {
  publishScheduledPost,
  type ScheduledPublishInput,
} from "./publish";

export const scheduledPublishTask = task({
  id: "scheduled-publish",
  run: async (payload: ScheduledPublishInput) => {
    return publishScheduledPost(payload);
  },
});
