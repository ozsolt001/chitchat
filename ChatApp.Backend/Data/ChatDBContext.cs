using Microsoft.EntityFrameworkCore;
using ChatApp.Backend.Models;

namespace ChatApp.Backend.Data;

public class ChatDbContext : DbContext
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomMember> RoomMembers => Set<RoomMember>();

    public ChatDbContext(DbContextOptions<ChatDbContext> options)
        : base(options)
    {
    }

    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        //Composite keys for RoomMember
        modelBuilder.Entity<RoomMember>()
            .HasKey(rm => new { rm.AccountId, rm.RoomId });

        //Explicit relationships 
        modelBuilder.Entity<RoomMember>()
            .HasOne(rm => rm.Account)
            .WithMany(a => a.RoomMemberships)
            .HasForeignKey(rm => rm.AccountId);

        modelBuilder.Entity<RoomMember>()
            .HasOne(rm => rm.Room)
            .WithMany(r => r.Members)
            .HasForeignKey(rm => rm.RoomId);
    }

}
