"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { v5 as uuidv5 } from "uuid";
import { Space, general_space } from "@/types/space";
import { Conversation } from "@/types/chat";

// Namespace for deterministic v5 UUIDs (can be any valid UUID)
const SPACE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";


interface SpacesContextType {
  spaces: Space[];
  addSpace: (space: Omit<Space, "id">) => void;
  updateSpace: (space: Space) => void;
  deleteSpace: (space_id: string) => void;
  activeSpace: Space ;
  setActiveSpace: (space: Space) => void;
  addSpaceConversation: (cspace_id: string, conversation: Conversation) => void;
  updateSpaceConversation: (space_id: string, conversation: Conversation) => void;
}

const SpacesContext = createContext<SpacesContextType | undefined>(undefined);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space>(general_space);

  const addSpace = (space: Omit<Space, "id">) => {
    const name = space.name?.trim() || `New Team Space ${spaces.length + 1}`;
    const id = uuidv5(name + Date.now(), SPACE_NAMESPACE); // deterministic but unique per creation

    const newSpace: Space = {
      ...space,
      id,
      name,
      users: space.users || [],
      documents: space.documents || [],
      region: space.region || "",
      lifetime: space.lifetime || null,
    };

    setSpaces((prev) => [...prev, newSpace]);
    // setActiveSpace(newSpace);
  };

  const updateSpace = (updatedSpace: Space) => {
    setSpaces((prev) =>
      prev.map((s) => (s.id === updatedSpace.id ? updatedSpace : s))
    );
    setActiveSpace(updatedSpace);
  };

  const addSpaceConversation = (space_id: string, conversation: Conversation) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === space_id
          ? { ...s, conversations: s.conversations ? [...s.conversations, conversation] : [conversation] }
          : s // Keep other spaces unchanged
      )
    );
  };

  const updateSpaceConversation = (space_id: string, conversation: Conversation) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === space_id
          ? {
              ...s,
              conversations: s.conversations
                ? s.conversations.map((c) =>
                    c.id === conversation.id ? { ...c, ...conversation } : c
                  )
                : [] // If conversations is undefined, initialize it as an empty array
            }
          : s // Keep other spaces unchanged
      )
    );
  };

  const deleteSpace = (space_id: string) => {
    const updatedSpaces = spaces.filter((space) => space.id != space_id);
    setSpaces(updatedSpaces);
    setActiveSpace(general_space);
  }

  return (
    <SpacesContext.Provider value={{ spaces, addSpace, updateSpace, deleteSpace, activeSpace, setActiveSpace, addSpaceConversation, updateSpaceConversation, }}>
      {children}
    </SpacesContext.Provider>
  );
}

export function useSpaces() {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error("useSpaces must be used within a SpacesProvider");
  }
  return context;
}
