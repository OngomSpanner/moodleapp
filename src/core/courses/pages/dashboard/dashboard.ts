// (C) Copyright 2015 Martin Dougiamas
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

import { Component, OnDestroy, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTabsComponent } from '@components/tabs/tabs';
import { CoreBlockDelegate } from '@core/block/providers/delegate';
import { CoreBlockComponent } from '@core/block/components/block/block';
import { CoreSiteHomeProvider } from '@core/sitehome/providers/sitehome';
import { CoreSiteHomeIndexComponent } from '@core/sitehome/components/index/index';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCoursesDashboardProvider } from '../../providers/dashboard';

/**
 * Page that displays the dashboard.
 */
@IonicPage({ segment: 'core-courses-dashboard' })
@Component({
    selector: 'page-core-courses-dashboard',
    templateUrl: 'dashboard.html',
})
export class CoreCoursesDashboardPage implements OnDestroy {
    @ViewChild(CoreTabsComponent) tabsComponent: CoreTabsComponent;
    @ViewChild(CoreSiteHomeIndexComponent) siteHomeComponent: CoreSiteHomeIndexComponent;
    @ViewChildren(CoreBlockComponent) blocksComponents: QueryList<CoreBlockComponent>;

    firstSelectedTab: number;
    siteHomeEnabled = false;
    tabsReady = false;
    searchEnabled: boolean;
    tabs = [];
    siteName: string;
    blocks: any[];
    dashboardEnabled = false;
    userId: number;
    dashboardLoaded = false;

    protected isDestroyed;
    protected updateSiteObserver;

    constructor(private navCtrl: NavController, private coursesProvider: CoreCoursesProvider,
            private sitesProvider: CoreSitesProvider, private siteHomeProvider: CoreSiteHomeProvider,
            private eventsProvider: CoreEventsProvider, private dashboardProvider: CoreCoursesDashboardProvider,
            private domUtils: CoreDomUtilsProvider, private blockDelegate: CoreBlockDelegate) {
        this.loadSiteName();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            this.searchEnabled = !this.coursesProvider.isSearchCoursesDisabledInSite();
            this.loadSiteName();
        });

        const promises = [];

        promises.push(this.siteHomeProvider.isAvailable().then((enabled) => {
            this.siteHomeEnabled = enabled;
        }));

        promises.push(this.loadDashboardContent());

        // Decide which tab to load first.
        Promise.all(promises).finally(() => {
            if (this.siteHomeEnabled && this.dashboardEnabled) {
                const site = this.sitesProvider.getCurrentSite(),
                    displaySiteHome = site.getInfo() && site.getInfo().userhomepage === 0;

                this.firstSelectedTab = displaySiteHome ? 0 : 1;
            } else {
                this.firstSelectedTab = 0;
            }

            this.tabsReady = true;
        });
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.tabsComponent && this.tabsComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.tabsComponent && this.tabsComponent.ionViewDidLeave();
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        this.navCtrl.push('CoreCoursesSearchPage');
    }

    /**
     * Load the site name.
     */
    protected loadSiteName(): void {
        this.siteName = this.sitesProvider.getCurrentSite().getInfo().sitename;
    }

    /**
     * Convenience function to fetch the dashboard data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadDashboardContent(): Promise<any> {
        return this.dashboardProvider.isAvailable().then((enabled) => {
            if (enabled) {
                this.userId = this.sitesProvider.getCurrentSiteUserId();

                return this.dashboardProvider.getDashboardBlocks().then((blocks) => {
                    this.blocks = blocks;
                }).catch((error) => {
                    this.domUtils.showErrorModal(error);

                    // Cannot get the blocks, just show dashboard if needed.
                    this.loadFallbackBlocks();
                });
            }

            // Not enabled, check separated tabs.
            this.loadFallbackBlocks();
        }).finally(() => {
            this.dashboardEnabled = this.blockDelegate.hasSupportedBlock(this.blocks);
            this.dashboardLoaded = true;
        });
    }

    /**
     * Refresh the dashboard data.
     *
     * @param {any} refresher Refresher.
     */
    refreshDashboard(refresher: any): void {
        const promises = [];

        promises.push(this.dashboardProvider.invalidateDashboardBlocks());

        // Invalidate the blocks.
        this.blocksComponents.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        Promise.all(promises).finally(() => {
            this.loadDashboardContent().finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Load fallback blocks to shown before 3.6 when dashboard blocks are not supported.
     */
    protected loadFallbackBlocks(): void {
        this.blocks = [
            {
                name: 'myoverview'
            },
            {
                name: 'timeline'
            }
        ];
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.updateSiteObserver && this.updateSiteObserver.off();
    }
}
