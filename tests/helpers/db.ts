import { db } from "@/lib/db";

export async function clearDatabase() {
  await db.manualRefreshEvent.deleteMany();
  await db.blockedPost.deleteMany();
  await db.scheduledEvent.deleteMany();
  await db.userPostState.deleteMany();
  await db.userSource.deleteMany();
  await db.post.deleteMany();
  await db.cacheEntry.deleteMany();
  await db.source.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verificationToken.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.inviteCode.deleteMany();
  await db.user.deleteMany();
}
