import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Reaction } from './entities/reaction.entity';
import { ReactionEntityType } from './enums/reaction-entity-type.enum';

interface GroupedReaction {
  emoji: string;
  count: number;
  actors: {
    id: string;
    fullName: string;
  }[];
}

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Reaction)
    private readonly reactionRepo: Repository<Reaction>,
  ) {}

  /**
   * Creates a new reaction or updates the existing
   * reaction if the actor has already reacted.
   */
  private async addOrUpdateReaction(
    entityType: ReactionEntityType,
    entityId: string,
    actorId: string,
    emoji: string,
  ): Promise<Reaction> {
    // if (!emoji?.trim()) {
    //   throw new BadRequestException('Emoji is required.');
    // }
    const existingReaction = await this.reactionRepo.findOne({
      where: {
        entityType,
        entityId,
        actorId,
      },
    });

    if (existingReaction) {
      existingReaction.emoji = emoji;
      return this.reactionRepo.save(existingReaction);
    }

    const reaction = this.reactionRepo.create({
      entityType,
      entityId,
      actorId,
      emoji,
    });

    return this.reactionRepo.save(reaction);
  }

  /**
   * Removesreaction from an entity the actor's .
   */
  private async removeReaction(
    entityType: ReactionEntityType,
    entityId: string,
    actorId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.reactionRepo.delete({
      entityType,
      entityId,
      actorId,
    });

    return {
      success: (result.affected ?? 0) > 0,
    };
  }

  /**
   * Returns grouped reactions for an entity.
   *
   * Example:
   *
   * 👍 x3
   * ❤️ x2
   * 😂 x1
   */
  private async getGroupedReactions(
    entityType: ReactionEntityType,
    entityId: string,
  ): Promise<GroupedReaction[]> {
    const reactions = await this.reactionRepo.find({
      where: {
        entityType,
        entityId,
      },
      relations: {
        actor: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const grouped = new Map<string, GroupedReaction>();

    for (const reaction of reactions) {
      let item = grouped.get(reaction.emoji);

      if (!item) {
        item = {
          emoji: reaction.emoji,
          count: 0,
          actors: [],
        };

        grouped.set(reaction.emoji, item);
      }

      item.count++;

      if (reaction.actor) {
        item.actors.push({
          id: reaction.actor.id,
          fullName: reaction.actor.fullName,
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
    // return Array.from(grouped.values());
  }
  // --------------------------------------------------------------------------
  // Ticket Reply Reactions
  // --------------------------------------------------------------------------

  async addTicketReplyReaction(
    ticketReplyId: string,
    actorId: string,
    emoji: string,
  ) {
    return this.addOrUpdateReaction(
      ReactionEntityType.TICKET_REPLY,
      ticketReplyId,
      actorId,
      emoji,
    );
  }

  async getTicketReplyReactions(ticketReplyId: string) {
    return this.getGroupedReactions(
      ReactionEntityType.TICKET_REPLY,
      ticketReplyId,
    );
  }

  async removeTicketReplyReaction(ticketReplyId: string, actorId: string) {
    return this.removeReaction(
      ReactionEntityType.TICKET_REPLY,
      ticketReplyId,
      actorId,
    );
  }

  // --------------------------------------------------------------------------
  // Internal Chat Reactions
  // --------------------------------------------------------------------------

  async addInternalChatReaction(
    internalChatId: string,
    actorId: string,
    emoji: string,
  ) {
    return this.addOrUpdateReaction(
      ReactionEntityType.INTERNAL_CHAT,
      internalChatId,
      actorId,
      emoji,
    );
  }

  async getInternalChatReactions(internalChatId: string) {
    return this.getGroupedReactions(
      ReactionEntityType.INTERNAL_CHAT,
      internalChatId,
    );
  }

  async removeInternalChatReaction(internalChatId: string, actorId: string) {
    return this.removeReaction(
      ReactionEntityType.INTERNAL_CHAT,
      internalChatId,
      actorId,
    );
  }

  // --------------------------------------------------------------------------
  // Thread Message Reactions
  // (Includes thread replies since replies are also ThreadMessages)
  // --------------------------------------------------------------------------

  async addThreadMessageReaction(
    threadMessageId: string,
    actorId: string,
    emoji: string,
  ) {
    return this.addOrUpdateReaction(
      ReactionEntityType.THREAD_MESSAGE,
      threadMessageId,
      actorId,
      emoji,
    );
  }

  async getThreadMessageReactions(threadMessageId: string) {
    return this.getGroupedReactions(
      ReactionEntityType.THREAD_MESSAGE,
      threadMessageId,
    );
  }

  async removeThreadMessageReaction(threadMessageId: string, actorId: string) {
    return this.removeReaction(
      ReactionEntityType.THREAD_MESSAGE,
      threadMessageId,
      actorId,
    );
  }
}
