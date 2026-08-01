import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "../app/page";

describe("single-form MVP page", () => {
  it("renders a direct new-case flow with core fields", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: "再生能源發電設備併聯審查申請表" })).toBeInTheDocument();
    expect(screen.getByLabelText("設置者名稱")).toBeInTheDocument();
    expect(screen.getByLabelText("預計併聯方式")).toBeInTheDocument();
    expect(screen.getByLabelText("裝置容量_新增設_瓩")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "匯出官方 Word" })).toBeInTheDocument();
  });

  it("shows the quick summary after case data changes", () => {
    render(<Page />);

    fireEvent.change(screen.getByLabelText("設置者名稱"), {
      target: { value: "吳威霖" }
    });
    fireEvent.change(screen.getByLabelText("設置場所或地點"), {
      target: { value: "高雄市鼓山區明德路31號" }
    });

    expect(screen.getByRole("heading", { name: "先填主要欄位，再匯出官方 Word" })).toBeInTheDocument();
    expect(screen.getAllByText("吳威霖").length).toBeGreaterThan(0);
    expect(screen.getAllByText("高雄市鼓山區明德路31號").length).toBeGreaterThan(0);
  });
});
