"use client";

import { useEffect, useState } from "react";

type Props = {
  iso: string;
};

export function LocalTime({ iso }: Props) {
  const [formatted, setFormatted] = useState(iso);

  useEffect(() => {
    const date = new Date(iso);
    const next = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    }).format(date);
    setFormatted(next);
  }, [iso]);

  return <time dateTime={iso}>{formatted}</time>;
}
