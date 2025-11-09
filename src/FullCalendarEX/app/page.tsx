import { ArrowRight, GithubIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import hero_img from "@/assets/hero.png";

export default async function Home() {
	return (
		<div className="relative w-full bg-neutral-950">
			<div className="absolute top-0 z-[0] h-full w-full bg-neutral-900/10 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"/>
			<section className="relative z-1 mx-auto max-w-full">
				<div className="pointer-events-none absolute h-full w-full overflow-hidden opacity-50 [perspective:200px]">
					<div className="absolute inset-0 [transform:rotateX(35deg)]">
						<div className="animate-grid [inset:0%_0px] [margin-left:-50%] [height:300vh] [width:600vw] [transform-origin:100%_0_0] [background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_0),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_0)] [background-size:120px_120px] [background-repeat:repeat]"></div>
					</div>
					<div className="absolute inset-0 bg-gradient-to-t from-black to-transparent to-90%"/>
				</div>

				<div className="z-10 mx-auto max-w-screen-xl h-screen gap-12 px-4 py-28 text-gray-600 md:px-8">
					<div className="mx-auto max-w-3xl space-y-5 text-center lg:leading-5">
						<div className="flex justify-center items-center">
							<Link
								href="https://github.com/yassir-jeraidi/full-calendar"
								className="text-white border p-3 rounded-full"
								target="_blank"
							>
								<GithubIcon />
							</Link>
						</div>
						<h1 className="font-geist group mx-auto w-fit rounded-3xl border-[2px] border-white/5 bg-gradient-to-tr from-zinc-300/5 via-gray-400/5 to-transparent px-5 py-2 text-sm text-gray-400">
							Organize your schedule effortlessly
							<ArrowRight className="ml-2 inline h-4 w-4 duration-300 group-hover:translate-x-1" />
						</h1>

						<h2 className="font-geist mx-auto bg-[linear-gradient(180deg,_#FFF_0%,_rgba(255,_255,_255,_0.00)_202.08%)] bg-clip-text text-4xl tracking-tighter text-transparent md:text-6xl">
							Manage your time better with{" "}
							<span className="bg-gradient-to-r from-purple-300 to-orange-200 bg-clip-text text-transparent">
								our Full Calendar Component.
							</span>
						</h2>

						<p className="mx-auto max-w-2xl text-gray-300">
							Plan, track, and stay on top of your events with an intuitive and
							customizable calendar designed for seamless scheduling.
						</p>
						<div className="items-center justify-center gap-x-3 flex sm:space-y-0">
							<span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
								<span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
								<div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-gray-950 text-xs font-medium text-gray-50 backdrop-blur-3xl">
									<Link
										href="/docs/react"
										className="group border-input inline-flex w-full items-center justify-center rounded-full border-[1px] bg-gradient-to-tr from-zinc-300/5 via-purple-400/20 to-transparent px-10 py-4 text-center text-white transition-colors hover:bg-transparent/90 sm:w-auto"
									>
										Getting Started
									</Link>
								</div>
							</span>
							<span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
								<span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
								<div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-gray-950 text-xs font-medium text-gray-50 backdrop-blur-3xl">
									<Link
										href="/calendar"
										className="group border-input inline-flex w-full items-center justify-center rounded-full border-[1px] bg-gradient-to-tr from-white via-orange-200 to-purple-300 px-10 py-4 text-center text-gray-900 transition-colors hover:bg-transparent/90 sm:w-auto"
									>
										Open demo
									</Link>
								</div>
							</span>
						</div>
					</div>
					<div className="md:mx-10 mt-10 md:mt-32">
						<Image
							src={hero_img}
							className="w-full rounded-lg border shadow-lg"
							alt="full calendar"
						/>
					</div>
				</div>
			</section>
		</div>
	);
}
