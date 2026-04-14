import AssistantChatClient from "../chat-client";

type AssistantChatHistoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AssistantChatHistoryPage({ params }: AssistantChatHistoryPageProps) {
  const { id } = await params;
  return <AssistantChatClient initialChatId={id} />;
}
