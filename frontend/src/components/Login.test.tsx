import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "@/components/Login";

describe("Login", () => {
  it("calls onLogin with the entered credentials", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<Login onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalledWith("user", "password");
  });

  it("shows an error message when login fails", async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error("Invalid username or password"));
    render(<Login onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
  });

  it("disables the submit button while signing in", async () => {
    let resolveLogin: () => void = () => {};
    const onLogin = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );
    render(<Login onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();

    resolveLogin();
    await waitFor(() => expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled());
  });
});
