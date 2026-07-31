import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "../app/page";

describe("single-form MVP page", () => {
  it("renders a direct new-case flow with core fields", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: "lihiPDF 單一表單 MVP" })).toBeInTheDocument();
    expect(screen.getByLabelText("設置者名稱")).toBeInTheDocument();
    expect(screen.getByLabelText("裝置容量_新增設_瓩")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "匯出官方 Word" })).toBeInTheDocument();
  });

  it("shows a preview summary after case data changes", () => {
    render(<Page />);

    fireEvent.change(screen.getByLabelText("設置者名稱"), {
      target: { value: "吳威霖" }
    });
    fireEvent.change(screen.getByLabelText("設置場所或地點"), {
      target: { value: "高雄市鼓山區明德路31號" }
    });

    expect(screen.getByText("預覽摘要")).toBeInTheDocument();
    expect(screen.getByText("吳威霖")).toBeInTheDocument();
    expect(screen.getByText("高雄市鼓山區明德路31號")).toBeInTheDocument();
  });
});
