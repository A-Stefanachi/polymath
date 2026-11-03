// Violation: ui-no-db-client (a page importing pg).
import pg from "pg";

export default function Page() {
  return <p>{typeof pg}</p>;
}
