import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "../app/page";

describe("single-form MVP page", () => {
  it("renders the framework-first flow with document selection", () => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: "lihiPDF 文件框架版" })).toBeInTheDocument();
    expect(screen.getByLabelText("併聯審查申請表")).toBeInTheDocument();
    expect(screen.getByLabelText("加入附件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "儲存公司資料" })).toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "先把框架補齊，再接多文件輸出" })).toBeInTheDocument();
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

  it("lets users toggle planned documents in the framework", () => {
    render(<Page />);

    const agreement = screen.getByLabelText("併聯協議書");
    fireEvent.click(agreement);

    expect(agreement).toBeChecked();
    expect(screen.getAllByText("併聯協議書").length).toBeGreaterThan(0);
  });

  it("saves and reapplies company defaults from the sidebar card", () => {
    render(<Page />);

    fireEvent.change(screen.getByLabelText("公司聯絡人"), {
      target: { value: "鄒侑廷" }
    });
    fireEvent.change(screen.getByLabelText("公司電話"), {
      target: { value: "0939-255-192" }
    });
    fireEvent.change(screen.getByLabelText("公司地址"), {
      target: { value: "高雄市前鎮區成功路88號" }
    });

    fireEvent.click(screen.getByRole("button", { name: "儲存公司資料" }));
    fireEvent.click(screen.getAllByRole("button", { name: "套用到案件" })[0]);

    expect(screen.getByRole("status")).toHaveTextContent(/公司預設資料已儲存|已把公司預設資料套用到案件聯絡資訊/);
  });
});
