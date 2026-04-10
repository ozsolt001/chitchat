using ChatApp.Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Backend.Data;

public class ChatDbContext : IdentityDbContext<Account, IdentityRole<int>, int>
{
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomMember> RoomMembers => Set<RoomMember>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    public ChatDbContext(DbContextOptions<ChatDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
