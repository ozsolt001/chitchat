public class RoomMember
{
    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;

    public RoomRole Role { get; set; }
}

public enum RoomRole
{
    Member = 0,
    Admin = 1,
    ReadOnly = 2
}