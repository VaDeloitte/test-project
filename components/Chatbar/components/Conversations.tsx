import { Conversation } from '@/types/chat';

import { ConversationComponent } from './Conversation';

interface Props {
  conversations: Conversation[];
  collapsed?:boolean
  update?:any
}

export const Conversations = (props: Props) => {
  const { conversations, collapsed } = props;
  return (
    <div className="flex w-full flex-col gap-1">
      {conversations
        .filter((conversation) => !conversation.folderId)
        .slice()
        .reverse()
        .map((conversation, index) => (
          <ConversationComponent key={index} update={()=>{props.update()}} conversation={conversation} collapsed={collapsed} />
        ))}
    </div>
  );
};
