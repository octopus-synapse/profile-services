/**
 * Connection Controller
 *
 * Handles HTTP endpoints for LinkedIn-style connection operations.
 *
 * Endpoints:
 * - POST   /v1/users/:userId/connect           - Send connection request
 * - PUT    /v1/connections/:id/accept           - Accept request
 * - PUT    /v1/connections/:id/reject           - Reject request
 * - DELETE /v1/connections/:id                  - Remove connection
 * - GET    /v1/users/me/connections             - List accepted connections
 * - GET    /v1/users/me/connections/pending     - List pending received
 * - GET    /v1/users/me/connections/suggestions - Suggestions
 * - GET    /v1/users/:userId/connection-stats   - Public stats
 * - GET    /v1/users/:userId/is-connected       - Check connection
 */

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { Public } from '@/bounded-contexts/identity/shared-kernel/infrastructure/decorators/public.decorator';
import { ApiDataResponse } from '@/bounded-contexts/platform/common/decorators/api-data-response.decorator';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { DataResponse } from '@/bounded-contexts/platform/common/dto/api-response.dto';
import { Permission, RequirePermission } from '@/shared-kernel/authorization';
import {
  ConnectionCheckDto,
  ConnectionListDataDto,
  ConnectionStatsDto,
  NetworkSummaryDataDto,
  PendingRequestsDataDto,
  SuggestionsDataDto,
} from '../dto/connection-response.dto';
import { ConnectionService } from '../services/connection.service';
import { FollowService } from '../services/follow.service';

// --- Controller ---

@ApiTags('social-connections')
@Controller()
export class ConnectionController {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly followService: FollowService,
  ) {}

  /**
   * Get a complete network summary for the authenticated user.
   * Returns stats, pending requests, connections, and suggestions in a single call.
   */
  @Get('v1/users/me/network-summary')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get network summary for authenticated user' })
  @ApiDataResponse(NetworkSummaryDataDto, { description: 'Network summary returned' })
  async getNetworkSummary(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<NetworkSummaryDataDto>> {
    const defaultPagination = { page: 1, limit: 10 };

    const [pendingRequests, connections, suggestions, socialStats, pendingCount] =
      await Promise.all([
        this.connectionService.getPendingRequests(user.userId, defaultPagination),
        this.connectionService.getConnections(user.userId, defaultPagination),
        this.connectionService.getConnectionSuggestions(user.userId, { page: 1, limit: 20 }),
        this.followService.getSocialStats(user.userId),
        this.connectionService.getPendingRequests(user.userId, { page: 1, limit: 1 }),
      ]);

    return {
      success: true,
      data: {
        stats: {
          connections: socialStats.connections,
          followers: socialStats.followers,
          following: socialStats.following,
          pendingInvitations: pendingCount.total,
        },
        pendingRequests,
        connections,
        suggestions,
      },
    };
  }

  /**
   * Send a connection request to a user.
   */
  @Post('v1/users/:userId/connect')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a connection request' })
  @ApiParam({ name: 'userId', type: 'string' })
  async sendConnectionRequest(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<DataResponse<{ id: string }>> {
    const connection = await this.connectionService.sendConnectionRequest(
      user.userId,
      targetUserId,
    );

    return {
      success: true,
      data: { id: connection.id },
      message: 'Connection request sent successfully',
    };
  }

  /**
   * Accept a connection request.
   */
  @Put('v1/connections/:id/accept')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a connection request' })
  @ApiParam({ name: 'id', type: 'string' })
  async acceptConnection(
    @CurrentUser() user: UserPayload,
    @Param('id') connectionId: string,
  ): Promise<DataResponse<{ id: string }>> {
    const connection = await this.connectionService.acceptConnection(connectionId, user.userId);

    return {
      success: true,
      data: { id: connection.id },
      message: 'Connection request accepted',
    };
  }

  /**
   * Reject a connection request.
   */
  @Put('v1/connections/:id/reject')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a connection request' })
  @ApiParam({ name: 'id', type: 'string' })
  async rejectConnection(
    @CurrentUser() user: UserPayload,
    @Param('id') connectionId: string,
  ): Promise<DataResponse<{ id: string }>> {
    const connection = await this.connectionService.rejectConnection(connectionId, user.userId);

    return {
      success: true,
      data: { id: connection.id },
      message: 'Connection request rejected',
    };
  }

  /**
   * Withdraw a sent (still pending) connection request.
   */
  @Delete('v1/connections/:id/withdraw')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a sent (pending) connection request' })
  @ApiParam({ name: 'id', type: 'string' })
  async withdrawSentRequest(
    @CurrentUser() user: UserPayload,
    @Param('id') connectionId: string,
  ): Promise<DataResponse<{ id: string }>> {
    await this.connectionService.withdrawSentRequest(connectionId, user.userId);
    return {
      success: true,
      data: { id: connectionId },
      message: 'Connection request withdrawn',
    };
  }

  /**
   * Remove an accepted connection.
   */
  @Delete('v1/connections/:id')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a connection' })
  @ApiParam({ name: 'id', type: 'string' })
  async removeConnection(
    @CurrentUser() user: UserPayload,
    @Param('id') connectionId: string,
  ): Promise<DataResponse<{ removed: boolean }>> {
    await this.connectionService.removeConnection(connectionId, user.userId);

    return {
      success: true,
      data: { removed: true },
      message: 'Connection removed successfully',
    };
  }

  /**
   * Get accepted connections for the current user.
   */
  @Get('v1/users/me/connections')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get accepted connections' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(ConnectionListDataDto, { description: 'Connections list returned' })
  async getConnections(
    @CurrentUser() user: UserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<DataResponse<ConnectionListDataDto>> {
    const result = await this.connectionService.getConnections(user.userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: { connections: result },
    };
  }

  /**
   * Get pending connection requests for the current user.
   */
  @Get('v1/users/me/connections/pending')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pending connection requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(PendingRequestsDataDto, { description: 'Pending requests returned' })
  async getPendingRequests(
    @CurrentUser() user: UserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<DataResponse<PendingRequestsDataDto>> {
    const result = await this.connectionService.getPendingRequests(user.userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: { pendingRequests: result },
    };
  }

  /**
   * Get connection requests sent by the current user (still pending).
   */
  @Get('v1/users/me/connections/sent')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get sent (pending) connection requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(PendingRequestsDataDto, { description: 'Sent requests returned' })
  async getSentRequests(
    @CurrentUser() user: UserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<DataResponse<PendingRequestsDataDto>> {
    const result = await this.connectionService.getSentRequests(user.userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    return {
      success: true,
      data: { pendingRequests: result },
    };
  }

  /**
   * Get connection suggestions for the current user.
   */
  @Get('v1/users/me/connections/suggestions')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get connection suggestions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiDataResponse(SuggestionsDataDto, { description: 'Suggestions returned' })
  async getConnectionSuggestions(
    @CurrentUser() user: UserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<DataResponse<SuggestionsDataDto>> {
    const suggestions = await this.connectionService.getConnectionSuggestions(user.userId, {
      page: Number(page),
      limit: Math.min(Number(limit), 20),
    });

    return {
      success: true,
      data: { suggestions },
    };
  }

  /**
   * Get connection stats for a user (public).
   */
  @Get('v1/users/:userId/connection-stats')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get connection stats for a user' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(ConnectionStatsDto, { description: 'Connection stats returned' })
  async getConnectionStats(
    @Param('userId') userId: string,
  ): Promise<DataResponse<ConnectionStatsDto>> {
    const stats = await this.connectionService.getConnectionStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Check connection status with a user. Returns both whether they're connected
   * and the pending outbound request id (if any), so the UI can offer withdraw.
   */
  @Get('v1/users/:userId/is-connected')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check connection status' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiDataResponse(ConnectionCheckDto, { description: 'Connection check returned' })
  async isConnected(
    @CurrentUser() user: UserPayload,
    @Param('userId') targetUserId: string,
  ): Promise<DataResponse<ConnectionCheckDto>> {
    const status = await this.connectionService.getConnectionStatusWith(user.userId, targetUserId);

    return {
      success: true,
      data: status,
    };
  }
}
