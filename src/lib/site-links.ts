const defaultTongxueUrl = "https://tongxue.yongle.school";

export const tongxueHomeUrl = (
  process.env.NEXT_PUBLIC_TONGXUE_URL ?? defaultTongxueUrl
).replace(/\/$/, "");

export const tongxueCreateUrl = `${tongxueHomeUrl}/create`;
