import { UnitNode } from "../types/unit";

/** 5 mock units across 2 books for development. */
export const MOCK_UNITS: UnitNode[] = [
  {
    id: "u1",
    title: "The Triune God",
    bookPath: "The Economy of God",
    status: "completed",
  },
  {
    id: "u2",
    title: "The Divine Dispensing",
    bookPath: "The Economy of God",
    status: "completed",
  },
  {
    id: "u3",
    title: "The Mingling of God with Man",
    bookPath: "The Economy of God",
    status: "current",
  },
  {
    id: "u4",
    title: "The Experience of Christ",
    bookPath: "The Experience of Life",
    status: "locked",
  },
  {
    id: "u5",
    title: "The Growth in Life",
    bookPath: "The Experience of Life",
    status: "locked",
  },
];
