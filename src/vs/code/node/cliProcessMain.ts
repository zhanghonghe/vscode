/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { ParsedArgs } from 'vs/code/node/argv';
import { TPromise } from 'vs/base/common/winjs.base';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { EnvironmentService } from 'vs/platform/environment/node/environmentService';
import { IEventService } from 'vs/platform/event/common/event';
import { EventService } from 'vs/platform/event/common/eventService';
import { IExtensionManagementService, IExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { getExtensionId } from 'vs/platform/extensionManagement/node/extensionManagementUtil';
import { ExtensionManagementService } from 'vs/platform/extensionManagement/node/extensionManagementService';
import { ExtensionGalleryService } from 'vs/platform/extensionManagement/node/extensionGalleryService';
import { ITelemetryService, NullTelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IRequestService } from 'vs/platform/request/common/request';
import { NodeRequestService } from 'vs/platform/request/node/nodeRequestService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { NodeConfigurationService } from 'vs/platform/configuration/node/nodeConfigurationService';

const notFound = id => localize('notFound', "Extension '{0}' not found.", id);
const useId = localize('useId', "Make sure you use the full extension id, eg: {0}", 'ms-vscode.csharp');

class Main {

	constructor(
		@IExtensionManagementService private extensionManagementService: IExtensionManagementService,
		@IExtensionGalleryService private extensionGalleryService: IExtensionGalleryService
	) {}

	run(argv: ParsedArgs): TPromise<any> {
		// TODO@joao - make this contributable

		if (argv['list-extensions']) {
			return this.listExtensions();
		} else if (argv['install-extension']) {
			return this.installExtension(argv['install-extension']);
		}
	}

	private listExtensions(): TPromise<any> {
		return this.extensionManagementService.getInstalled().then(extensions => {
			extensions.forEach(e => console.log(`${ e.displayName } (${ getExtensionId(e) })`));
		});
	}

	private installExtension(id: string): TPromise<any> {
		return this.extensionGalleryService.query({ ids: [id] }).then(result => {
			const [extension] = result.firstPage;

			if (!extension) {
				return TPromise.wrapError(`${ notFound(id) }\n${ useId }`);
			}

			return this.extensionManagementService.getInstalled().then(installed => {
				const isInstalled = installed.some(e => getExtensionId(e) === id);

				if (isInstalled) {
					return TPromise.wrapError(localize('alreadyInstalled', "Extension '{0}' is already installed.", id));
				}

				console.log(localize('foundExtension', "Found '{0}' in the marketplace.", id));
				console.log(localize('installing', "Installing..."));

				return this.extensionManagementService.install(extension).then(extension => {
					console.log(localize('successInstall', "Extension '{0}' v{1} was successfully installed!",
						getExtensionId(extension),
						extension.version
					));
				});
			});
		});
	}
}

export function main(argv: ParsedArgs): TPromise<void> {
	const services = new ServiceCollection();

	services.set(IEventService, new SyncDescriptor(EventService));
	services.set(IEnvironmentService, new SyncDescriptor(EnvironmentService));
	services.set(ITelemetryService, NullTelemetryService);
	services.set(IConfigurationService, new SyncDescriptor(NodeConfigurationService));
	services.set(IRequestService, new SyncDescriptor(NodeRequestService));
	services.set(IExtensionManagementService, new SyncDescriptor(ExtensionManagementService));
	services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryService));

	const instantiationService: IInstantiationService = new InstantiationService(services);
	const main = instantiationService.createInstance(Main);
	return main.run(argv);
}