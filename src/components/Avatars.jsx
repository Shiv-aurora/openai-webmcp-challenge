import { useContext } from "preact/hooks";
import { styled } from "styled-components";
import { MystState } from "../mystState";

const MAX_AVATARS = 4;

const AvatarsWrapper = styled.div`
  min-width: ${(props) => props.n * 22}px;
  display: flex;
  align-items: center;

  .avatar {
    border-radius: 50%;
    border: 2px solid;
    height: 24px;
    width: 24px;
    margin: 0 0 0 -6px;
    box-sizing: border-box;
    transition: margin-left 0.15s ease;
    float: right;

    &:hover {
      margin-left: 0;
    }

    &.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      border-color: var(--gray-300);
      background-color: var(--gray-100);
      color: var(--ink-secondary);
      font-style: normal;
      font-size: 10px;
      font-weight: 600;
    }
  }
`;

export const Avatar = ({ name, color, avatarUrl, userUrl }) => {
  const { options } = useContext(MystState);

  return (
    <a href={userUrl || "#"} target="_blank" rel="noreferrer">
      <img src={avatarUrl} key={name} title={name} class="avatar" style={`border-color: ${color}`} crossOrigin={options.avatarCrossorigin.value} />
    </a>
  );
};

const AvatarPlaceholder = ({ n, usernames }) => (
  <div class="avatar placeholder" title={usernames}>
    +{n}
  </div>
);

const Avatars = () => {
  const { collab } = useContext(MystState);
  const nUserAvatarsToShow = collab.value.users.value.length <= MAX_AVATARS ? collab.value.users.value.length : 3;

  return (
    <AvatarsWrapper n={Math.min(collab.value.users.value.length, MAX_AVATARS)}>
      {nUserAvatarsToShow < collab.value.users.value.length && (
        <AvatarPlaceholder
          n={collab.value.users.value.length - nUserAvatarsToShow}
          usernames={collab.value.users.value
            .filter((_, idx) => idx >= MAX_AVATARS - 1)
            .map((u) => u.name)
            .join(", ")}
        />
      )}
      {collab.value.users.value.slice(0, nUserAvatarsToShow).map((user) => (
        <Avatar key={user.name} {...user} />
      ))}
    </AvatarsWrapper>
  );
};

export default Avatars;
