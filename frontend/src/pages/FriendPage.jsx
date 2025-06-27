// src/pages/FriendPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";
import { useChatContext } from "stream-chat-react";
import toast from "react-hot-toast";

const FriendPage = () => {
  const navigate = useNavigate();
  const { client } = useChatContext();
  const [unreadCounts, setUnreadCounts] = useState({});

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  useEffect(() => {
    if (!client || !friends.length) return;

    const counts = {};
    const subs = [];

    const setupChannels = async () => {
      for (const friend of friends) {
        const channelId = [client.user.id, friend._id].sort().join("-");
        const channel = client.channel("messaging", channelId, {
          members: [client.user.id, friend._id],
        });

        await channel.watch();
        counts[friend._id] = channel.countUnread();

        const handleMessage = (event) => {
          console.log("New message event received:", event);
          if (event.user.id === client.user.id) return;

          setUnreadCounts((prev) => ({
            ...prev,
            [friend._id]: (prev[friend._id] || 0) + 1,
          }));

          toast.success(`New message from ${event.user.name}`, {
            icon: "💬",
          });
        };

        channel.on("message.new", handleMessage);
        subs.push({ channel, handler: handleMessage });
      }

      setUnreadCounts(counts);
      setUnreadCounts(counts);
    };
    setupChannels();

    return () => {
      subs.forEach(({ channel, handler }) => {
        channel.off("message.new", handler);
      });
    };
  }, [client, friends]);

  const handleFriendClick = (friendId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [friendId]: 0,
    }));
    navigate(`/chat/${friendId}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-bold mb-6">Friends</h2>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : friends.length === 0 ? (
        <div>No friends found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {friends.map((friend) => (
            <div
              key={friend._id}
              className="card bg-base-200 p-4 cursor-pointer hover:shadow-lg relative"
              onClick={() => handleFriendClick(friend._id)}
            >
              <div className="flex items-center gap-4">
                <img
                  src={friend.profilePic}
                  alt={friend.fullName}
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-lg">{friend.fullName}</h3>
                  <p className="text-sm opacity-70">
                    {friend.nativeLanguage} → {friend.learningLanguage}
                  </p>
                </div>
              </div>
              {unreadCounts[friend._id] > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                  {unreadCounts[friend._id]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendPage;
