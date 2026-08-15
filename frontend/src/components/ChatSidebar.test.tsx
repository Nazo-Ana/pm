import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSidebar } from "@/components/ChatSidebar";

describe("ChatSidebar", () => {
  it("sends a message and displays the assistant's reply", async () => {
    const onSend = vi.fn().mockResolvedValue({ message: "Done.", board: { columns: [], cards: {} } });
    render(<ChatSidebar onSend={onSend} />);

    await userEvent.type(screen.getByLabelText("Message"), "Create a card");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith("Create a card");
    expect(await screen.findByText("Done.")).toBeInTheDocument();
  });

  it("shows an error message in the chat when sending fails", async () => {
    const onSend = vi.fn().mockRejectedValue(new Error("The assistant is unavailable."));
    render(<ChatSidebar onSend={onSend} />);

    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText("The assistant is unavailable.")).toBeInTheDocument();
  });

  it("disables the send button until a message is entered", async () => {
    render(<ChatSidebar onSend={vi.fn()} />);
    const button = screen.getByRole("button", { name: /send message/i });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Message"), "Hi");
    expect(button).toBeEnabled();
  });
});
