namespace ChatApp.Backend.Models;

public class Room
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public bool IsPrivate { get; set; }

    public ICollection<RoomMember> Members { get; set; } = new List<RoomMember>();
}
