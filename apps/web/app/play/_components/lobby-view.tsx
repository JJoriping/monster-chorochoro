"use client";

import { lexicon } from "@daldalso/i18n";
import {
  MAX_PLAYERS_PER_ROOM,
  NICKNAME_MAX_LENGTH,
  ROOM_TITLE_MAX_LENGTH,
  type RoomSummary,
} from "@monster-chorochoro/common";
import { DoorOpen, Plus, UserRound, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import lPlay from "@/i18n/l.play";
import { usePlay } from "./play-provider";
import { Button, MapBadge, Panel, TextInput } from "./ui";

const LobbyView = () => {
  return (
    <div c="grid gap-4 lg:h-full lg:grid-cols-[1fr_20rem]">
      <RoomList />
      <div c="flex min-h-0 flex-col gap-4">
        <Profile />
        <UserList />
      </div>
    </div>
  );
};
export default LobbyView;

const RoomList = () => {
  const { rooms, users, myId, send } = usePlay();
  const l = lexicon(lPlay);
  const [title, setTitle] = useState("");
  const myNickname = users.find((v) => v.id === myId)?.nickname ?? "";
  const defaultTitle = l("defaultRoomTitle", myNickname);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send({ type: "createRoom", title: title.trim() || defaultTitle });
    setTitle("");
  };

  return (
    <Panel
      title={l("roomList")}
      icon={DoorOpen}
      c="min-h-80"
      action={
        <form onSubmit={handleSubmit} c="flex gap-2">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle}
            maxLength={ROOM_TITLE_MAX_LENGTH}
            c="w-48"
          />
          <Button type="submit">
            <Plus size={14} />
            {l("createRoom")}
          </Button>
        </form>
      }
    >
      {rooms.length ? (
        <ul c="flex flex-col gap-2 overflow-y-auto p-3">
          {rooms.map((v) => (
            <RoomItem key={v.id} room={v} onJoin={() => send({ type: "joinRoom", roomId: v.id })} />
          ))}
        </ul>
      ) : (
        <p c="m-auto p-8 text-center text-b3 text-gray">{l("noRooms")}</p>
      )}
    </Panel>
  );
};

const RoomItem = ({ room, onJoin }: { room: RoomSummary; onJoin: () => void }) => {
  const l = lexicon(lPlay);
  const full = room.playerCount >= MAX_PLAYERS_PER_ROOM;
  const playing = room.status === "playing";

  return (
    <li>
      <button
        type="button"
        onClick={onJoin}
        disabled={full || playing}
        c={[
          "flex w-full items-center gap-3 rounded-lg border-2 border-blue-5 px-3 py-2.5 text-left transition-colors",
          "hover:border-blue-3 hover:bg-blue-5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-blue-5 disabled:hover:bg-white",
        ]}
      >
        <span c="w-8 shrink-0 text-b3 font-bold text-blue">{room.id}</span>
        <span c="min-w-0 flex-1 truncate text-b2 font-bold">{room.title}</span>
        <MapBadge mapId={room.mapId} />
        <span c="w-10 shrink-0 text-right text-b3 tabular-nums text-gray+2">
          {room.playerCount}/{MAX_PLAYERS_PER_ROOM}
        </span>
        <span
          c={[
            "w-14 shrink-0 rounded-full py-0.5 text-center text-b4 font-bold",
            playing ? "bg-orange-4 text-orange+2" : "bg-green-4 text-green+2",
            !playing && full && "bg-gray-4 text-gray+2",
          ]}
        >
          {playing ? l("roomPlaying") : full ? l("roomFull") : l("roomWaiting")}
        </span>
      </button>
    </li>
  );
};

const UserList = () => {
  const { users, myId } = usePlay();
  const l = lexicon(lPlay);

  return (
    <Panel
      title={l("userList")}
      icon={Users}
      c="max-h-96 flex-1 lg:max-h-none"
      action={<span c="text-b3 font-bold tabular-nums text-blue">{users.length}</span>}
    >
      <ul c="flex flex-col overflow-y-auto p-2">
        {users.map((v) => (
          <li key={v.id} c="flex items-center gap-2 rounded-md px-2 py-1.5 text-b3">
            <span c="min-w-0 flex-1 truncate font-bold">{v.nickname}</span>
            {v.id === myId && (
              <span c="rounded-full bg-blue px-1.5 text-b5 font-bold text-white">{l("me")}</span>
            )}
            <span c="shrink-0 text-b4 text-gray">
              {v.roomId === null ? l("inLobby") : l("inRoom", v.roomId)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

const Profile = () => {
  const { users, myId } = usePlay();
  const l = lexicon(lPlay);
  const me = users.find((v) => v.id === myId);

  return (
    <Panel title={l("profile")} icon={UserRound}>
      {me && (
        <div c="flex flex-col gap-3 p-4">
          <p c="flex items-baseline gap-2">
            <span c="truncate text-h5 font-black">{me.nickname}</span>
            <span c="text-b4 text-gray">#{me.id}</span>
          </p>
          {/* 서버에서 닉네임이 바뀌면 입력란도 새 닉네임으로 되돌린다 */}
          <NicknameForm key={me.nickname} nickname={me.nickname} />
        </div>
      )}
    </Panel>
  );
};

const NicknameForm = ({ nickname }: { nickname: string }) => {
  const { send } = usePlay();
  const l = lexicon(lPlay);
  const [value, setValue] = useState(nickname);
  const trimmed = value.trim();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send({ type: "setNickname", nickname: trimmed });
  };

  return (
    <form onSubmit={handleSubmit} c="flex gap-2">
      <TextInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={NICKNAME_MAX_LENGTH}
        aria-label={l("nickname")}
        c="flex-1"
      />
      <Button type="submit" variant="secondary" disabled={!trimmed || trimmed === nickname}>
        {l("changeNickname")}
      </Button>
    </form>
  );
};
