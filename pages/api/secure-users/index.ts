import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
import SecureUser from '../../../utils/lib/types/secure-user.model';
import AuditLog from '../../../utils/lib/types/audit-log.model';

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

  await connectDB();

  switch (method) {
    case 'POST':
      // Create or update user on login
      try {
        const { 
          username, 
          email, 
          azureAdId, 
          serviceLine, 
          country, 
          department, 
          officeLocation,
          roles 
        } = req.body;

        if (!email || !azureAdId) {
          return res.status(400).json({
            success: false,
            message: 'Email and azureAdId are required',
          });
        }

        // Check if user exists
        let user = await SecureUser.findOne({ email });

        if (user) {
          // Update existing user's last login and profile
          user.lastLoginAt = new Date();
          user.status = 'active';
          user.username = username || user.username;
          user.azureAdId = azureAdId;
          user.country = country || user.country;
          user.department = department || user.department;
          user.officeLocation = officeLocation || user.officeLocation;
          
          if (serviceLine && Array.isArray(serviceLine)) {
            user.serviceLine = serviceLine;
          }
          
          if (roles && Array.isArray(roles)) {
            user.roles = roles;
          }

          await user.save();

          // Log the login event
          await AuditLog.create({
            eventType: 'user_login',
            entityType: 'user',
            entityId: user._id,
            entityName: user.username,
            action: 'logged_in',
            initiatedBy: {
              userId: user.azureAdId,
              email: user.email,
              source: 'Azure AD',
            },
            timestamp: new Date(),
            details: {
              country: user.country,
              department: user.department,
              serviceLine: user.serviceLine,
            },
          });

          return res.status(200).json({
            success: true,
            data: user,
            message: 'User login updated successfully',
          });
        } else {
          // Create new user
          user = await SecureUser.create({
            username: username || email.split('@')[0],
            email,
            azureAdId,
            serviceLine: serviceLine || [],
            roles: roles || ['user'],
            country,
            department,
            officeLocation,
            lastLoginAt: new Date(),
            status: 'active',
          });

          // Log the user creation event
          await AuditLog.create({
            eventType: 'user_created',
            entityType: 'user',
            entityId: user._id,
            entityName: user.username,
            action: 'created',
            initiatedBy: {
              userId: user.azureAdId,
              email: user.email,
              source: 'Azure AD',
            },
            timestamp: new Date(),
            details: {
              country: user.country,
              department: user.department,
              serviceLine: user.serviceLine,
            },
          });

          return res.status(201).json({
            success: true,
            data: user,
            message: 'User created successfully',
          });
        }
      } catch (error) {
        console.error('Error in user login/create:', error);
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }

    case 'GET':
      // Get users (with optional status filter)
      try {
        const { status, email } = req.query;

        let query: any = {};
        if (status) {
          query.status = status;
        }
        if (email) {
          query.email = email;
        }

        const users = await SecureUser.find(query)
          .select('-__v')
          .sort({ lastLoginAt: -1 })
          .limit(200);

        return res.status(200).json({
          success: true,
          data: users,
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }

    case 'PUT':
      // Update last login time
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Email is required',
          });
        }

        const user = await SecureUser.findOneAndUpdate(
          { email },
          {
            $set: {
              lastLoginAt: new Date(),
              status: 'active',
              updatedAt: new Date(),
            },
          },
          { new: true }
        );

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        await AuditLog.create({
          eventType: 'user_login_updated',
          entityType: 'user',
          entityId: user._id,
          entityName: user.username,
          action: 'updated',
          initiatedBy: {
            email: user.email,
            source: 'API',
          },
          timestamp: new Date(),
        });

        return res.status(200).json({
          success: true,
          data: user,
          message: `User ${user.username} lastLogin updated`,
        });
      } catch (error) {
        console.error('Error updating user login:', error);
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }

    case 'DELETE':
      // Delete user by email
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Email is required',
          });
        }

        const user = await SecureUser.findOne({ email });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
          });
        }

        // Soft delete: mark as deleted
        user.deletedAt = new Date();
        user.status = 'inactive';
        await user.save();

        await AuditLog.create({
          eventType: 'user_deleted',
          entityType: 'user',
          entityId: user._id,
          entityName: user.username,
          action: 'soft_deleted',
          initiatedBy: {
            source: 'API',
          },
          timestamp: new Date(),
          reason: 'User lifecycle cleanup',
          details: {
            email: email,
          },
        });

        return res.status(200).json({
          success: true,
          message: `User ${user.username} (${email}) soft deleted successfully`,
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        const message = error instanceof Error ? error.message : 'An error occurred';
        return res.status(500).json({ success: false, message });
      }

    default:
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
      });
  }
}
