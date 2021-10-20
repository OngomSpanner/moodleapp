// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';

import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonMessageOutputDelegate } from '@addons/messageoutput/services/messageoutput-delegate';
import {
    AddonNotificationsNotificationMessageFormatted,
    AddonNotificationsPreferences,
    AddonNotificationsPreferencesComponent,
    AddonNotificationsPreferencesNotification,
    AddonNotificationsPreferencesNotificationProcessor,
    AddonNotificationsPreferencesProcessor,
} from './notifications';
import { CoreTextUtils } from '@services/utils/text';

/**
 * Service that provides some helper functions for notifications.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsHelperProvider {

    /**
     * Formats the text of a notification.
     *
     * @param notification The notification object.
     */
    formatNotificationText(
        notification: AddonNotificationsNotificationMessageFormatted,
    ): AddonNotificationsNotificationToRender {
        const formattedNotification: AddonNotificationsNotificationToRender = notification;
        formattedNotification.displayfullhtml = this.shouldDisplayFullHtml(notification);
        formattedNotification.iconurl = formattedNotification.iconurl || undefined; // Make sure the property exists.

        formattedNotification.mobiletext = formattedNotification.displayfullhtml ?
            notification.fullmessagehtml :
            CoreTextUtils.replaceNewLines((formattedNotification.mobiletext || '').replace(/-{4,}/ig, ''), '<br>');

        return formattedNotification;
    }

    /**
     * Format preferences data.
     *
     * @param preferences Preferences to format.
     * @return Formatted preferences.
     */
    formatPreferences(preferences: AddonNotificationsPreferences): AddonNotificationsPreferencesFormatted {
        const formattedPreferences: AddonNotificationsPreferencesFormatted = preferences;

        formattedPreferences.processors.forEach((processor) => {
            processor.supported = AddonMessageOutputDelegate.hasHandler(processor.name, true);
        });

        formattedPreferences.components.forEach((component) => {
            component.notifications.forEach((notification) => {
                notification.processorsByName = CoreUtils.arrayToObject(notification.processors, 'name');
            });
        });

        return formattedPreferences;
    }

    /**
     * Get a certain processor from a list of processors.
     *
     * @param processors List of processors.
     * @param name Name of the processor to get.
     * @param fallback True to return first processor if not found, false to not return any. Defaults to true.
     * @return Processor.
     */
    getProcessor(
        processors: AddonNotificationsPreferencesProcessor[],
        name: string,
        fallback: boolean = true,
    ): AddonNotificationsPreferencesProcessor | undefined {
        if (!processors || !processors.length) {
            return;
        }

        const processor = processors.find((processor) => processor.name == name);
        if (processor) {
            return processor;
        }

        // Processor not found, return first if requested.
        if (fallback) {
            return processors[0];
        }
    }

    /**
     * Return the components and notifications that have a certain processor.
     *
     * @param processorName Name of the processor to filter.
     * @param components Array of components.
     * @return Filtered components.
     */
    getProcessorComponents(
        processorName: string,
        components: AddonNotificationsPreferencesComponentFormatted[],
    ): AddonNotificationsPreferencesComponentFormatted[] {
        const result: AddonNotificationsPreferencesComponentFormatted[] = [];

        components.forEach((component) => {
            // Check if the component has any notification with this processor.
            const notifications: AddonNotificationsPreferencesNotificationFormatted[] = [];

            component.notifications.forEach((notification) => {
                const processor = notification.processorsByName?.[processorName];

                if (processor) {
                    // Add the notification.
                    notifications.push(notification);
                }
            });

            if (notifications.length) {
                // At least 1 notification added, add the component to the result.
                result.push({
                    displayname: component.displayname,
                    notifications,
                });
            }
        });

        return result;
    }

    /**
     * Check whether we should display full HTML of the notification.
     *
     * @param notification Notification.
     * @return Whether to display full HTML.
     */
    protected shouldDisplayFullHtml(notification: AddonNotificationsNotificationToRender): boolean {
        return notification.component == 'mod_forum' && notification.eventtype == 'digests';
    }

}

export const AddonNotificationsHelper = makeSingleton(AddonNotificationsHelperProvider);

/**
 * Preferences with some calculated data.
 */
export type AddonNotificationsPreferencesFormatted = Omit<AddonNotificationsPreferences, 'processors'|'components'> & {
    processors: AddonNotificationsPreferencesProcessorFormatted[]; // Config form values.
    components: AddonNotificationsPreferencesComponentFormatted[]; // Available components.
};

/**
 * Preferences component with some calculated data.
 */
export type AddonNotificationsPreferencesComponentFormatted = Omit<AddonNotificationsPreferencesComponent, 'notifications'> & {
    notifications: AddonNotificationsPreferencesNotificationFormatted[]; // List of notificaitons for the component.
};

/**
 * Preferences notification with some calculated data.
 */
export type AddonNotificationsPreferencesNotificationFormatted = AddonNotificationsPreferencesNotification & {
    processorsByName?: Record<string, AddonNotificationsPreferencesNotificationProcessor>; // Calculated in the app.
};

/**
 * Preferences processor with some calculated data.
 */
export type AddonNotificationsPreferencesProcessorFormatted = AddonNotificationsPreferencesProcessor & {
    supported?: boolean; // Calculated in the app. Whether the processor is supported in the app.
};

/**
 * Notification with some calculated data to render it.
 */
export type AddonNotificationsNotificationToRender = AddonNotificationsNotificationMessageFormatted & {
    displayfullhtml?: boolean; // Whether to display the full HTML of the notification.
    iconurl?: string;
};
