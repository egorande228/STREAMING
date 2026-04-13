import type { Match, MatchStatus } from "@/lib/types";

export function formatMatchLabel(match: Match): string {
  return `${match.homeTeam} vs ${match.awayTeam}`;
}

export function formatStatus(status: MatchStatus): string {
  switch (status) {
    case "test match":
      return "Test match";
    case "upcoming":
      return "Upcoming";
    case "live":
      return "Live now";
    case "ended":
      return "Ended";
  }
}

export function groupMatches<T extends { status: MatchStatus }>(matches: T[]) {
  return {
    live: matches.filter((match) => match.status === "live"),
    upcoming: matches.filter(
      (match) => match.status === "upcoming" || match.status === "test match"
    ),
    ended: matches.filter((match) => match.status === "ended")
  };
}

export function formatIsoForInput(iso: string): string {
  return iso.slice(0, 16);
}
