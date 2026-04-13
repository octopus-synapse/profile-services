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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
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
  PendingRequestsDataDto,
  SuggestionsDataDto,
} from '../dto/connection-response.dto';
import { ConnectionService } from '../services/connection.service';

// --- Controller ---

@ApiTags('social-connections')
@Controller()
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

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
   * Get connection suggestions for the current user.
   */
  @Get('v1/users/me/connections/suggestions')
  @RequirePermission(Permission.SOCIAL_USE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get connection suggestions' })
  @ApiDataResponse(SuggestionsDataDto, { description: 'Suggestions returned' })
  async getConnectionSuggestions(
    @CurrentUser() user: UserPayload,
  ): Promise<DataResponse<SuggestionsDataDto>> {
    const suggestions = await this.connectionService.getConnectionSuggestions(user.userId);

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
   * Check if the current user is connected with target user.
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
    const isConnected = await this.connectionService.isConnected(user.userId, targetUserId);

    return {
      success: true,
      data: { isConnected },
    };
  }
}
