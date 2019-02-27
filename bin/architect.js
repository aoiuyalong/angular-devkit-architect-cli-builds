#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const architect_1 = require("@angular-devkit/architect");
const node_1 = require("@angular-devkit/architect/node");
const core_1 = require("@angular-devkit/core");
const node_2 = require("@angular-devkit/core/node");
const fs_1 = require("fs");
const minimist = require("minimist");
const path = require("path");
const operators_1 = require("rxjs/operators");
const progress_1 = require("../src/progress");
function findUp(names, from) {
    if (!Array.isArray(names)) {
        names = [names];
    }
    const root = path.parse(from).root;
    let currentDir = from;
    while (currentDir && currentDir !== root) {
        for (const name of names) {
            const p = path.join(currentDir, name);
            if (fs_1.existsSync(p)) {
                return p;
            }
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}
/**
 * Show usage of the CLI tool, and exit the process.
 */
function usage(logger, exitCode = 0) {
    logger.info(core_1.tags.stripIndent `
    architect [project][:target][:configuration] [options, ...]

    Run a project target.
    If project/target/configuration are not specified, the workspace defaults will be used.

    Options:
        --help              Show available options for project target.
                            Shows this message instead when ran without the run argument.


    Any additional option is passed the target, overriding existing options.
  `);
    process.exit(exitCode);
    throw 0; // The node typing sometimes don't have a never type for process.exit().
}
function _targetStringFromTarget({ project, target, configuration }) {
    return `${project}:${target}${configuration !== undefined ? ':' + configuration : ''}`;
}
async function _executeTarget(parentLogger, workspace, root, argv, registry) {
    const architectHost = new node_1.WorkspaceNodeModulesArchitectHost(workspace, root);
    const architect = new architect_1.index2.Architect(architectHost, registry);
    // Split a target into its parts.
    const targetStr = argv._.shift() || '';
    const [project, target, configuration] = targetStr.split(':');
    const targetSpec = { project, target, configuration };
    delete argv['help'];
    delete argv['_'];
    const logger = new core_1.logging.Logger('jobs');
    const logs = [];
    logger.subscribe(entry => logs.push(Object.assign({}, entry, { message: `${entry.name}: ` + entry.message })));
    const run = await architect.scheduleTarget(targetSpec, argv, { logger });
    const bars = new progress_1.MultiProgressBar(':name :bar (:current/:total) :status');
    run.progress.subscribe(update => {
        const data = bars.get(update.id) || {
            id: update.id,
            builder: update.builder,
            target: update.target,
            status: update.status || '',
            name: ((update.target ? _targetStringFromTarget(update.target) : update.builder.name)
                + ' '.repeat(80)).substr(0, 40),
        };
        if (update.status !== undefined) {
            data.status = update.status;
        }
        switch (update.state) {
            case architect_1.index2.BuilderProgressState.Error:
                data.status = 'Error: ' + update.error;
                bars.update(update.id, data);
                break;
            case architect_1.index2.BuilderProgressState.Stopped:
                data.status = 'Done.';
                bars.complete(update.id);
                bars.update(update.id, data, update.total, update.total);
                break;
            case architect_1.index2.BuilderProgressState.Waiting:
                bars.update(update.id, data);
                break;
            case architect_1.index2.BuilderProgressState.Running:
                bars.update(update.id, data, update.current, update.total);
                break;
        }
        bars.render();
    });
    // Wait for full completion of the builder.
    try {
        const result = await run.output.pipe(operators_1.last()).toPromise();
        if (result.success) {
            parentLogger.info(core_1.terminal.green('SUCCESS'));
        }
        else {
            parentLogger.info(core_1.terminal.yellow('FAILURE'));
        }
        parentLogger.info('\nLogs:');
        logs.forEach(l => parentLogger.next(l));
        await run.stop();
        bars.terminate();
        return result.success ? 0 : 1;
    }
    catch (err) {
        parentLogger.info(core_1.terminal.red('ERROR'));
        parentLogger.info('\nLogs:');
        logs.forEach(l => parentLogger.next(l));
        parentLogger.fatal('Exception:');
        parentLogger.fatal(err.stack);
        return 2;
    }
}
async function main(args) {
    /** Parse the command line. */
    const argv = minimist(args, { boolean: ['help'] });
    /** Create the DevKit Logger used through the CLI. */
    const logger = node_2.createConsoleLogger(argv['verbose']);
    // Check the target.
    const targetStr = argv._[0] || '';
    if (!targetStr || argv.help) {
        // Show architect usage if there's no target.
        usage(logger);
    }
    // Load workspace configuration file.
    const currentPath = process.cwd();
    const configFileNames = [
        'angular.json',
        '.angular.json',
        'workspace.json',
        '.workspace.json',
    ];
    const configFilePath = findUp(configFileNames, currentPath);
    if (!configFilePath) {
        logger.fatal(`Workspace configuration file (${configFileNames.join(', ')}) cannot be found in `
            + `'${currentPath}' or in parent directories.`);
        return 3;
    }
    const root = core_1.dirname(core_1.normalize(configFilePath));
    const configContent = fs_1.readFileSync(configFilePath, 'utf-8');
    const workspaceJson = JSON.parse(configContent);
    const registry = new core_1.schema.CoreSchemaRegistry();
    registry.addPostTransform(core_1.schema.transforms.addUndefinedDefaults);
    const host = new node_2.NodeJsSyncHost();
    const workspace = new core_1.experimental.workspace.Workspace(root, host);
    await workspace.loadWorkspaceFromJson(workspaceJson).toPromise();
    return await _executeTarget(logger, workspace, root, argv, registry);
}
main(process.argv.slice(2))
    .then(code => {
    process.exit(code);
}, err => {
    console.error('Error: ' + err.stack || err.message || err);
    process.exit(-1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaGl0ZWN0LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9hcmNoaXRlY3RfY2xpL2Jpbi9hcmNoaXRlY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBUUEseURBQW1EO0FBQ25ELHlEQUFtRjtBQUNuRiwrQ0FROEI7QUFDOUIsb0RBQWdGO0FBQ2hGLDJCQUE4QztBQUM5QyxxQ0FBcUM7QUFDckMsNkJBQTZCO0FBQzdCLDhDQUFzQztBQUN0Qyw4Q0FBbUQ7QUFHbkQsU0FBUyxNQUFNLENBQUMsS0FBd0IsRUFBRSxJQUFZO0lBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3pCLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ2pCO0lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFFbkMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQ3RCLE9BQU8sVUFBVSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7UUFDeEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDeEIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEMsSUFBSSxlQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pCLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjtRQUVELFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQ3ZDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLEtBQUssQ0FBQyxNQUFzQixFQUFFLFFBQVEsR0FBRyxDQUFDO0lBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLFdBQVcsQ0FBQTs7Ozs7Ozs7Ozs7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QUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFbkUsTUFBTSxTQUFTLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFakUsT0FBTyxNQUFNLGNBQWMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDdkUsQ0FBQztBQUVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JCLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsQ0FBQztJQUMzRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBpbmRleDIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IFdvcmtzcGFjZU5vZGVNb2R1bGVzQXJjaGl0ZWN0SG9zdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3Qvbm9kZSc7XG5pbXBvcnQge1xuICBkaXJuYW1lLFxuICBleHBlcmltZW50YWwsXG4gIGpzb24sXG4gIGxvZ2dpbmcsXG4gIG5vcm1hbGl6ZSxcbiAgc2NoZW1hLFxuICB0YWdzLCB0ZXJtaW5hbCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgTm9kZUpzU3luY0hvc3QsIGNyZWF0ZUNvbnNvbGVMb2dnZXIgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZS9ub2RlJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG1pbmltaXN0IGZyb20gJ21pbmltaXN0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBsYXN0IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgTXVsdGlQcm9ncmVzc0JhciB9IGZyb20gJy4uL3NyYy9wcm9ncmVzcyc7XG5cblxuZnVuY3Rpb24gZmluZFVwKG5hbWVzOiBzdHJpbmcgfCBzdHJpbmdbXSwgZnJvbTogc3RyaW5nKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShuYW1lcykpIHtcbiAgICBuYW1lcyA9IFtuYW1lc107XG4gIH1cbiAgY29uc3Qgcm9vdCA9IHBhdGgucGFyc2UoZnJvbSkucm9vdDtcblxuICBsZXQgY3VycmVudERpciA9IGZyb207XG4gIHdoaWxlIChjdXJyZW50RGlyICYmIGN1cnJlbnREaXIgIT09IHJvb3QpIHtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgbmFtZXMpIHtcbiAgICAgIGNvbnN0IHAgPSBwYXRoLmpvaW4oY3VycmVudERpciwgbmFtZSk7XG4gICAgICBpZiAoZXhpc3RzU3luYyhwKSkge1xuICAgICAgICByZXR1cm4gcDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjdXJyZW50RGlyID0gcGF0aC5kaXJuYW1lKGN1cnJlbnREaXIpO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogU2hvdyB1c2FnZSBvZiB0aGUgQ0xJIHRvb2wsIGFuZCBleGl0IHRoZSBwcm9jZXNzLlxuICovXG5mdW5jdGlvbiB1c2FnZShsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyLCBleGl0Q29kZSA9IDApOiBuZXZlciB7XG4gIGxvZ2dlci5pbmZvKHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgYXJjaGl0ZWN0IFtwcm9qZWN0XVs6dGFyZ2V0XVs6Y29uZmlndXJhdGlvbl0gW29wdGlvbnMsIC4uLl1cblxuICAgIFJ1biBhIHByb2plY3QgdGFyZ2V0LlxuICAgIElmIHByb2plY3QvdGFyZ2V0L2NvbmZpZ3VyYXRpb24gYXJlIG5vdCBzcGVjaWZpZWQsIHRoZSB3b3Jrc3BhY2UgZGVmYXVsdHMgd2lsbCBiZSB1c2VkLlxuXG4gICAgT3B0aW9uczpcbiAgICAgICAgLS1oZWxwICAgICAgICAgICAgICBTaG93IGF2YWlsYWJsZSBvcHRpb25zIGZvciBwcm9qZWN0IHRhcmdldC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTaG93cyB0aGlzIG1lc3NhZ2UgaW5zdGVhZCB3aGVuIHJhbiB3aXRob3V0IHRoZSBydW4gYXJndW1lbnQuXG5cblxuICAgIEFueSBhZGRpdGlvbmFsIG9wdGlvbiBpcyBwYXNzZWQgdGhlIHRhcmdldCwgb3ZlcnJpZGluZyBleGlzdGluZyBvcHRpb25zLlxuICBgKTtcblxuICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICB0aHJvdyAwOyAgLy8gVGhlIG5vZGUgdHlwaW5nIHNvbWV0aW1lcyBkb24ndCBoYXZlIGEgbmV2ZXIgdHlwZSBmb3IgcHJvY2Vzcy5leGl0KCkuXG59XG5cbmZ1bmN0aW9uIF90YXJnZXRTdHJpbmdGcm9tVGFyZ2V0KHtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb259OiBpbmRleDIuVGFyZ2V0KSB7XG4gIHJldHVybiBgJHtwcm9qZWN0fToke3RhcmdldH0ke2NvbmZpZ3VyYXRpb24gIT09IHVuZGVmaW5lZCA/ICc6JyArIGNvbmZpZ3VyYXRpb24gOiAnJ31gO1xufVxuXG5cbmludGVyZmFjZSBCYXJJbmZvIHtcbiAgc3RhdHVzPzogc3RyaW5nO1xuICBidWlsZGVyOiBpbmRleDIuQnVpbGRlckluZm87XG4gIHRhcmdldD86IGluZGV4Mi5UYXJnZXQ7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gX2V4ZWN1dGVUYXJnZXQoXG4gIHBhcmVudExvZ2dlcjogbG9nZ2luZy5Mb2dnZXIsXG4gIHdvcmtzcGFjZTogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2UsXG4gIHJvb3Q6IHN0cmluZyxcbiAgYXJndjogbWluaW1pc3QuUGFyc2VkQXJncyxcbiAgcmVnaXN0cnk6IGpzb24uc2NoZW1hLlNjaGVtYVJlZ2lzdHJ5LFxuKSB7XG4gIGNvbnN0IGFyY2hpdGVjdEhvc3QgPSBuZXcgV29ya3NwYWNlTm9kZU1vZHVsZXNBcmNoaXRlY3RIb3N0KHdvcmtzcGFjZSwgcm9vdCk7XG4gIGNvbnN0IGFyY2hpdGVjdCA9IG5ldyBpbmRleDIuQXJjaGl0ZWN0KGFyY2hpdGVjdEhvc3QsIHJlZ2lzdHJ5KTtcblxuICAvLyBTcGxpdCBhIHRhcmdldCBpbnRvIGl0cyBwYXJ0cy5cbiAgY29uc3QgdGFyZ2V0U3RyID0gYXJndi5fLnNoaWZ0KCkgfHwgJyc7XG4gIGNvbnN0IFtwcm9qZWN0LCB0YXJnZXQsIGNvbmZpZ3VyYXRpb25dID0gdGFyZ2V0U3RyLnNwbGl0KCc6Jyk7XG4gIGNvbnN0IHRhcmdldFNwZWMgPSB7IHByb2plY3QsIHRhcmdldCwgY29uZmlndXJhdGlvbiB9O1xuXG4gIGRlbGV0ZSBhcmd2WydoZWxwJ107XG4gIGRlbGV0ZSBhcmd2WydfJ107XG5cbiAgY29uc3QgbG9nZ2VyID0gbmV3IGxvZ2dpbmcuTG9nZ2VyKCdqb2JzJyk7XG4gIGNvbnN0IGxvZ3M6IGxvZ2dpbmcuTG9nRW50cnlbXSA9IFtdO1xuICBsb2dnZXIuc3Vic2NyaWJlKGVudHJ5ID0+IGxvZ3MucHVzaCh7IC4uLmVudHJ5LCBtZXNzYWdlOiBgJHtlbnRyeS5uYW1lfTogYCArIGVudHJ5Lm1lc3NhZ2UgfSkpO1xuXG4gIGNvbnN0IHJ1biA9IGF3YWl0IGFyY2hpdGVjdC5zY2hlZHVsZVRhcmdldCh0YXJnZXRTcGVjLCBhcmd2LCB7IGxvZ2dlciB9KTtcbiAgY29uc3QgYmFycyA9IG5ldyBNdWx0aVByb2dyZXNzQmFyPG51bWJlciwgQmFySW5mbz4oJzpuYW1lIDpiYXIgKDpjdXJyZW50Lzp0b3RhbCkgOnN0YXR1cycpO1xuXG4gIHJ1bi5wcm9ncmVzcy5zdWJzY3JpYmUoXG4gICAgdXBkYXRlID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSBiYXJzLmdldCh1cGRhdGUuaWQpIHx8IHtcbiAgICAgICAgaWQ6IHVwZGF0ZS5pZCxcbiAgICAgICAgYnVpbGRlcjogdXBkYXRlLmJ1aWxkZXIsXG4gICAgICAgIHRhcmdldDogdXBkYXRlLnRhcmdldCxcbiAgICAgICAgc3RhdHVzOiB1cGRhdGUuc3RhdHVzIHx8ICcnLFxuICAgICAgICBuYW1lOiAoKHVwZGF0ZS50YXJnZXQgPyBfdGFyZ2V0U3RyaW5nRnJvbVRhcmdldCh1cGRhdGUudGFyZ2V0KSA6IHVwZGF0ZS5idWlsZGVyLm5hbWUpXG4gICAgICAgICAgICAgICAgKyAnICcucmVwZWF0KDgwKVxuICAgICAgICAgICAgICApLnN1YnN0cigwLCA0MCksXG4gICAgICB9O1xuXG4gICAgICBpZiAodXBkYXRlLnN0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRhdGEuc3RhdHVzID0gdXBkYXRlLnN0YXR1cztcbiAgICAgIH1cblxuICAgICAgc3dpdGNoICh1cGRhdGUuc3RhdGUpIHtcbiAgICAgICAgY2FzZSBpbmRleDIuQnVpbGRlclByb2dyZXNzU3RhdGUuRXJyb3I6XG4gICAgICAgICAgZGF0YS5zdGF0dXMgPSAnRXJyb3I6ICcgKyB1cGRhdGUuZXJyb3I7XG4gICAgICAgICAgYmFycy51cGRhdGUodXBkYXRlLmlkLCBkYXRhKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIGluZGV4Mi5CdWlsZGVyUHJvZ3Jlc3NTdGF0ZS5TdG9wcGVkOlxuICAgICAgICAgIGRhdGEuc3RhdHVzID0gJ0RvbmUuJztcbiAgICAgICAgICBiYXJzLmNvbXBsZXRlKHVwZGF0ZS5pZCk7XG4gICAgICAgICAgYmFycy51cGRhdGUodXBkYXRlLmlkLCBkYXRhLCB1cGRhdGUudG90YWwsIHVwZGF0ZS50b3RhbCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSBpbmRleDIuQnVpbGRlclByb2dyZXNzU3RhdGUuV2FpdGluZzpcbiAgICAgICAgICBiYXJzLnVwZGF0ZSh1cGRhdGUuaWQsIGRhdGEpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgaW5kZXgyLkJ1aWxkZXJQcm9ncmVzc1N0YXRlLlJ1bm5pbmc6XG4gICAgICAgICAgYmFycy51cGRhdGUodXBkYXRlLmlkLCBkYXRhLCB1cGRhdGUuY3VycmVudCwgdXBkYXRlLnRvdGFsKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgYmFycy5yZW5kZXIoKTtcbiAgICB9LFxuICApO1xuXG4gIC8vIFdhaXQgZm9yIGZ1bGwgY29tcGxldGlvbiBvZiB0aGUgYnVpbGRlci5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBydW4ub3V0cHV0LnBpcGUobGFzdCgpKS50b1Byb21pc2UoKTtcblxuICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgcGFyZW50TG9nZ2VyLmluZm8odGVybWluYWwuZ3JlZW4oJ1NVQ0NFU1MnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudExvZ2dlci5pbmZvKHRlcm1pbmFsLnllbGxvdygnRkFJTFVSRScpKTtcbiAgICB9XG5cbiAgICBwYXJlbnRMb2dnZXIuaW5mbygnXFxuTG9nczonKTtcbiAgICBsb2dzLmZvckVhY2gobCA9PiBwYXJlbnRMb2dnZXIubmV4dChsKSk7XG5cbiAgICBhd2FpdCBydW4uc3RvcCgpO1xuICAgIGJhcnMudGVybWluYXRlKCk7XG5cbiAgICByZXR1cm4gcmVzdWx0LnN1Y2Nlc3MgPyAwIDogMTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcGFyZW50TG9nZ2VyLmluZm8odGVybWluYWwucmVkKCdFUlJPUicpKTtcbiAgICBwYXJlbnRMb2dnZXIuaW5mbygnXFxuTG9nczonKTtcbiAgICBsb2dzLmZvckVhY2gobCA9PiBwYXJlbnRMb2dnZXIubmV4dChsKSk7XG5cbiAgICBwYXJlbnRMb2dnZXIuZmF0YWwoJ0V4Y2VwdGlvbjonKTtcbiAgICBwYXJlbnRMb2dnZXIuZmF0YWwoZXJyLnN0YWNrKTtcblxuICAgIHJldHVybiAyO1xuICB9XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gbWFpbihhcmdzOiBzdHJpbmdbXSk6IFByb21pc2U8bnVtYmVyPiB7XG4gIC8qKiBQYXJzZSB0aGUgY29tbWFuZCBsaW5lLiAqL1xuICBjb25zdCBhcmd2ID0gbWluaW1pc3QoYXJncywgeyBib29sZWFuOiBbJ2hlbHAnXSB9KTtcblxuICAvKiogQ3JlYXRlIHRoZSBEZXZLaXQgTG9nZ2VyIHVzZWQgdGhyb3VnaCB0aGUgQ0xJLiAqL1xuICBjb25zdCBsb2dnZXIgPSBjcmVhdGVDb25zb2xlTG9nZ2VyKGFyZ3ZbJ3ZlcmJvc2UnXSk7XG5cbiAgLy8gQ2hlY2sgdGhlIHRhcmdldC5cbiAgY29uc3QgdGFyZ2V0U3RyID0gYXJndi5fWzBdIHx8ICcnO1xuICBpZiAoIXRhcmdldFN0ciB8fCBhcmd2LmhlbHApIHtcbiAgICAvLyBTaG93IGFyY2hpdGVjdCB1c2FnZSBpZiB0aGVyZSdzIG5vIHRhcmdldC5cbiAgICB1c2FnZShsb2dnZXIpO1xuICB9XG5cbiAgLy8gTG9hZCB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlLlxuICBjb25zdCBjdXJyZW50UGF0aCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVOYW1lcyA9IFtcbiAgICAnYW5ndWxhci5qc29uJyxcbiAgICAnLmFuZ3VsYXIuanNvbicsXG4gICAgJ3dvcmtzcGFjZS5qc29uJyxcbiAgICAnLndvcmtzcGFjZS5qc29uJyxcbiAgXTtcblxuICBjb25zdCBjb25maWdGaWxlUGF0aCA9IGZpbmRVcChjb25maWdGaWxlTmFtZXMsIGN1cnJlbnRQYXRoKTtcblxuICBpZiAoIWNvbmZpZ0ZpbGVQYXRoKSB7XG4gICAgbG9nZ2VyLmZhdGFsKGBXb3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlICgke2NvbmZpZ0ZpbGVOYW1lcy5qb2luKCcsICcpfSkgY2Fubm90IGJlIGZvdW5kIGluIGBcbiAgICAgICsgYCcke2N1cnJlbnRQYXRofScgb3IgaW4gcGFyZW50IGRpcmVjdG9yaWVzLmApO1xuXG4gICAgcmV0dXJuIDM7XG4gIH1cblxuICBjb25zdCByb290ID0gZGlybmFtZShub3JtYWxpemUoY29uZmlnRmlsZVBhdGgpKTtcbiAgY29uc3QgY29uZmlnQ29udGVudCA9IHJlYWRGaWxlU3luYyhjb25maWdGaWxlUGF0aCwgJ3V0Zi04Jyk7XG4gIGNvbnN0IHdvcmtzcGFjZUpzb24gPSBKU09OLnBhcnNlKGNvbmZpZ0NvbnRlbnQpO1xuXG4gIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IHNjaGVtYS5Db3JlU2NoZW1hUmVnaXN0cnkoKTtcbiAgcmVnaXN0cnkuYWRkUG9zdFRyYW5zZm9ybShzY2hlbWEudHJhbnNmb3Jtcy5hZGRVbmRlZmluZWREZWZhdWx0cyk7XG5cbiAgY29uc3QgaG9zdCA9IG5ldyBOb2RlSnNTeW5jSG9zdCgpO1xuICBjb25zdCB3b3Jrc3BhY2UgPSBuZXcgZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2Uocm9vdCwgaG9zdCk7XG5cbiAgYXdhaXQgd29ya3NwYWNlLmxvYWRXb3Jrc3BhY2VGcm9tSnNvbih3b3Jrc3BhY2VKc29uKS50b1Byb21pc2UoKTtcblxuICByZXR1cm4gYXdhaXQgX2V4ZWN1dGVUYXJnZXQobG9nZ2VyLCB3b3Jrc3BhY2UsIHJvb3QsIGFyZ3YsIHJlZ2lzdHJ5KTtcbn1cblxubWFpbihwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpXG4gIC50aGVuKGNvZGUgPT4ge1xuICAgIHByb2Nlc3MuZXhpdChjb2RlKTtcbiAgfSwgZXJyID0+IHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjogJyArIGVyci5zdGFjayB8fCBlcnIubWVzc2FnZSB8fCBlcnIpO1xuICAgIHByb2Nlc3MuZXhpdCgtMSk7XG4gIH0pO1xuIl19