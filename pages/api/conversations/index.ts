import type { NextApiRequest, NextApiResponse } from 'next';

import connectDB from '../../../utils/lib/dbconnect';
import Conversation from '../../../utils/lib/types/conversation.model';

import { v4 as uuidv5 } from 'uuid';

interface Data {
  success: boolean;
  data?: any;
  length?:any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const { method } = req;

  await connectDB(); // Ensure the database is connected

  async function getSizeOfConversations(userId: any) {
    const conversations = await Conversation.find({ userId });
    let totalSize = 0;

    conversations?.forEach((conversation: any) => {
      const conversationSize = Buffer.byteLength(JSON.stringify(conversation));
      totalSize += conversationSize;
    });

    return totalSize;
  }

  switch (method) {
    case 'PATCH': {
      try {
        const { conversationId, userId } = req.query;
        const { messageIndex, newContent, newFile, newRole } = req.body;

        if (!conversationId || !userId) {
          return res.status(400).json({
            success: false,
            message: 'conversationId and userId must be provided in the query.',
          });
        }

        if (
          messageIndex === undefined ||
          (newContent === undefined && newFile === undefined && newRole === undefined)
        ) {
          return res.status(400).json({
            success: false,
            message: 'messageIndex and at least one of newContent, newFile, or newRole must be provided.',
          });
        }

        const conversation = await Conversation.findOne({ id: conversationId, userId });

        if (!conversation) {
          return res.status(404).json({
            success: false,
            message: 'Conversation not found.',
          });
        }

        if (messageIndex < 0 || messageIndex >= conversation.messages.length) {
          return res.status(404).json({
            success: false,
            message: 'Message index out of bounds.',
          });
        }

        if (newContent !== undefined) conversation.messages[messageIndex].content = newContent;
        if (newFile !== undefined) conversation.messages[messageIndex].file = newFile;
        if (newRole !== undefined) conversation.messages[messageIndex].role = newRole;

        await conversation.save();

        return res.status(200).json({
          success: true,
          data: conversation,
          message: 'Message updated successfully.',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }
      break;
    }

    case 'POST': {
      try {
        const { id, userId, model, messages, name, prompt, temperature, folderId, workflow } = req.body;

        if (!userId || !model || !messages || !name) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields: userId, model, messages, and name must be provided.',
          });
        }

        const existingConversation = await Conversation.findOne({ id, userId });

        if (existingConversation) {
          if (messages.length >= existingConversation.messages.length) {
            const updatedConversation = await Conversation.findOneAndUpdate(
              { id, userId },
              {
                $set: {
                  model,
                  messages,
                  name,
                  prompt,
                  temperature,
                  folderId,
                  workflow,
                },
              },
              { new: true, upsert: true }
            );

            return res.status(200).json({
              success: true,
              data: updatedConversation,
              message: 'Conversation updated successfully',
            });
          } else {
            return res.status(400).json({
              success: false,
              message: 'The provided messages array is shorter than the existing one, update aborted.',
            });
          }
        } else {
          const newConversation = await Conversation.create({
            id: id || uuidv5(),
            userId,
            model,
            messages,
            name,
            prompt,
            temperature,
            folderId,
            workflow,
          });

          return res.status(201).json({
            success: true,
            data: newConversation,
            message: 'Conversation created successfully',
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }
      break;
    }

    case 'GET': {
      try {
        const { userId, type, limit, skip }: any = req.query;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'userId must be provided in the query.',
          });
        }

        const totalSize = await Conversation.countDocuments({ userId });
        const conversations =
          type == '2'
            ? await Conversation.find({ userId })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select({ messages: { $slice: -15 } })
            : await Conversation.find({ userId })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select({ messages: { $slice: -15 } });

        if (!conversations.length) {
          return res.status(404).json({
            success: false,
            message: 'No conversations found for this user.',
          });
        }

        return res.status(200).json({
          success: true,
          data: conversations,
          length: totalSize,
          message: 'Conversations retrieved successfully.',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }
      break;
    }

    case 'PUT': {
      try {
        const { id, userId, name } = req.body;

        if (!id || !userId || !name) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields: id, userId, and name must be provided.',
          });
        }

        const updatedConversation = await Conversation.findOneAndUpdate(
          { id, userId },
          { name },
          { new: true }
        );

        if (!updatedConversation) {
          return res.status(404).json({
            success: false,
            message: 'Conversation not found.',
          });
        }

        return res.status(200).json({
          success: true,
          data: updatedConversation,
          message: 'Conversation name updated successfully.',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }
      break;
    }

    case 'DELETE': {
      try {
        const { userId, id } = req.query;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'userId must be provided in the query.',
          });
        }

        if (id && userId) {
          const result = await Conversation.deleteOne({ userId, id });

          if (result.deletedCount === 0) {
            return res.status(404).json({
              success: false,
              message: 'No conversation found to delete.',
            });
          }

          const remainingConversations = await Conversation.find({ userId }).select('id');

          return res.status(200).json({
            success: true,
            data: {
              deletedCount: result.deletedCount,
              remainingConversationIds: remainingConversations.map((convo) => convo.id),
            },
            message: 'Conversation deleted successfully.',
          });
        } else {
          const result = await Conversation.deleteMany({ userId });

          return res.status(200).json({
            success: true,
            data: { deletedCount: result.deletedCount },
            message: 'All conversations for the user have been deleted successfully.',
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }
      break;
    }

    default: {
      res.status(405).json({ success: false, message: 'Method not allowed' });
      break;
    }
  }
}
