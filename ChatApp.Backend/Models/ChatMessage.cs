namespace ChatApp.Backend.Models;

public class ChatMessage
{
    public int Id { get; set; }

    public string User { get; set; } = string.Empty;
    public int AccountId { get; set; }
    public int RoomId { get; set; }
    public string Message { get; set; } = string.Empty;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
