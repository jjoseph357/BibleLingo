// ============================================================
// Unit Node Types for the Path Screen
// ============================================================

export type UnitStatus = "completed" | "current" | "locked";

export interface UnitNode {
  id: string;
  title: string;
  bookPath: string;
  status: UnitStatus;
}
