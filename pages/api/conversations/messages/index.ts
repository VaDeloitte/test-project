import { v4 as uuidv5 } from 'uuid';
import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../../utils/lib/dbconnect';
import Conversation from '../../../../utils/lib/types/conversation.model';

interface Data {
  success: boolean;
  data?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { method } = req;

  await connectDB(); // Ensure the database is connected

  switch (method) {
    case 'DELETE':
        try {
          const { conversationId, userId, messageIndex }:any = req.query;
      
          if (!conversationId || !userId || messageIndex === undefined) {
            return res.status(400).json({
              success: false,
              message: 'conversationId, userId, and messageIndex must be provided in the query.',
            });
          }
      
          // Find the conversation
          const conversation = await Conversation.findOne({ id: conversationId, userId });
      
          if (!conversation) {
            return res.status(404).json({
              success: false,
              message: 'Conversation not found.',
            });
          }
      
          // Check if the message index is within the bounds of the message array
          if (messageIndex < 0 || messageIndex >= conversation.messages.length) {
            return res.status(404).json({
              success: false,
              message: 'Message index out of bounds.',
            });
          }
      
          // Remove the message at the specified index
          conversation.messages.splice(messageIndex, 1);
      
          // Save the updated conversation
          await conversation.save();
      
          return res.status(200).json({
            success: true,
            data: conversation,
            message: 'Message deleted successfully.',
          });
      
        } catch (error) {
          // Handle any errors that occur during deletion
          const message = error instanceof Error ? error.message : 'An error occurred';
          return res.status(500).json({ success: false, message });
        }
        break;
      
      try {
        const { userId } = req.query;

        // Check if userId is provided
        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'userId must be provided in the query.',
          });
        }

        // Find all conversations for the given userId
        const conversations = await Conversation.find({ userId })
              .sort({updatedAt:-1})
             

        if (!conversations.length) {
          return res.status(404).json({
            success: false,
            message: 'No conversations found for this user.',
          });
        }

        return res.status(200).json({
          success: true,
          data: conversations,
          message: 'Conversations retrieved successfully.',
        });
      } catch (error:any) {
        // Handle any errors that occur during retrieval
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }
      break;

    default:
      res.status(405).json({ success: false, message: 'Method not allowed' });
      break;
  }
}