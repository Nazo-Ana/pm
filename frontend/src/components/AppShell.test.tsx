import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "@/components/AppShell";
import { ApiError } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      login: vi.fn(),
      board: vi.fn(),
      saveBoard: vi.fn(),
      chat: vi.fn(),
    },
  };
});

const { api } = await import("@/lib/api");

const board = {
  columns: [{ id: "col-a", title: "A", cardIds: [] }],
  cards: {},
};

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("AppShell", () => {
  it("shows the login screen when there is no session token", async () => {
    render(<AppShell />);
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("loads the board automatically when a session token exists", async () => {
    sessionStorage.setItem("pm-token", "test-token");
    vi.mocked(api.board).mockResolvedValue(board);

    render(<AppShell />);

    expect(await screen.findByText("Kanban Studio")).toBeInTheDocument();
  });

  it("clears the token and shows login when the stored token is rejected", async () => {
    sessionStorage.setItem("pm-token", "bad-token");
    vi.mocked(api.board).mockRejectedValue(new ApiError(401, "Authentication required"));

    render(<AppShell />);

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("pm-token")).toBeNull();
  });

  it("shows a corrupted-board message instead of the login form on a 409", async () => {
    sessionStorage.setItem("pm-token", "test-token");
    vi.mocked(api.board).mockRejectedValue(new ApiError(409, "board_data_invalid"));

    render(<AppShell />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/corrupted/i);
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
    // The token stays valid (only the board is broken), so it is not cleared.
    expect(sessionStorage.getItem("pm-token")).toBe("test-token");
  });

  it("shows the corrupted-board message after a successful login if the board is invalid", async () => {
    vi.mocked(api.login).mockResolvedValue({ token: "test-token", username: "user" });
    vi.mocked(api.board).mockRejectedValue(new ApiError(409, "board_data_invalid"));

    render(<AppShell />);

    await userEvent.type(await screen.findByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/corrupted/i);
  });

  it("lets the user sign out of the corrupted-board screen back to login", async () => {
    sessionStorage.setItem("pm-token", "test-token");
    vi.mocked(api.board).mockRejectedValue(new ApiError(409, "board_data_invalid"));

    render(<AppShell />);
    await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("pm-token")).toBeNull();
  });
});
