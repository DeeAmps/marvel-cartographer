"use client";

import RatingInput from "./RatingInput";

export default function RatingSection({ editionId }: { editionId: string }) {
  return <RatingInput editionId={editionId} />;
}
