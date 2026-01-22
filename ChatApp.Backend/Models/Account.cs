public class Account
{
    public int Id { get; set; }
    public string UserName { get; set; } = null!;

    public ICollection<RoomMember> RoomMemberships { get; set; } = new List<RoomMember>();
}
