import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("reveals inner-line fields and lists all installation categories", () => {
    render(<Page />);

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "預計併聯方式" })).getAllByRole("button")[1]);
    expect(screen.getByPlaceholderText("併聯用戶內線時填寫")).toBeInTheDocument();
    expect(screen.getByLabelText("契約容量_瓩")).toBeInTheDocument();

    expect(screen.getAllByText("太陽光電").length).toBeGreaterThan(0);
    expect(screen.getAllByText("風力").length).toBeGreaterThan(0);
    expect(screen.getAllByText("生質能").length).toBeGreaterThan(0);
    expect(screen.getAllByText("廢棄物").length).toBeGreaterThan(0);

    fireEvent.click(within(screen.getByRole("radiogroup", { name: "風力設置分類" })).getByRole("button", { name: /離岸/ }));
    expect(within(screen.getByRole("radiogroup", { name: "再生能源類別" })).getByRole("button", { name: /風力/ })).toHaveClass("is-active");
  });

  it("shows kw unit boxes beside capacity inputs", () => {
    render(<Page />);

    expect(screen.getAllByText("瓩").length).toBeGreaterThanOrEqual(6);
  });
});
