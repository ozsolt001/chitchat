namespace ChatApp.Backend.Models;

public class ChatMessage
{
    public const string TextType = "text";
    public const string GifType = "gif";

    public int Id { get; set; }

    public string User { get; set; } = string.Empty;
    public int AccountId { get; set; }
    public int RoomId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string MessageType { get; set; } = TextType;
    public string? MediaUrl { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
