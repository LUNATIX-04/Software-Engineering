import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider";
import type { FC, ReactNode, SVGProps } from "react";
import { baseOptions } from "@/app/docs/layout.config";
import { icons } from "@/components/icons";
import { Particles } from "@/components/ui/particles";
import { Spotlight } from "@/components/ui/spotlight";
import { source } from "@/lib/source";

interface Mode {
	param: string;
	name: string;
	description?: string;
	icon: FC<SVGProps<SVGSVGElement>>;
}

const modes: Mode[] = [
	{
		param: "react",
		name: "React",
		description: "Full calendar for React",
		icon: icons.ReactIcon,
	},
];

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
			<RootProvider>
				<Spotlight />

				<Particles
					className="absolute inset-0 z-0"
					quantity={100}
					ease={80}
					refresh
					color="#FF2056FF"
				/>
				<DocsLayout
					{...baseOptions}
					links={[]}
					tree={source.pageTree}
					sidebar={{
						tabs: false,
						banner: (
							<RootToggle
								className="flex flex-row items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fd-accent/50 hover:text-fd-accent-foreground -mx-2"
								options={modes.map((mode) => ({
									url: `/docs/${mode.param}`,
									icon: <mode.icon className="shrink-0 rounded-md p-1.5" />,
									title: mode.name,
									description: mode.description,
								}))}
							/>
						),
					}}
				>
					{children}
				</DocsLayout>
			</RootProvider>
		</div>
	);
}
