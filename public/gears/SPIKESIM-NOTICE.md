# Gears source and assets in the unified SpikeSim workspace

Copied from https://github.com/QuirkyCort/gears at commit
20b8e874ab9c3e08a37dfbcb6b10bbef94f90921 on 2026-11-01.
The complete upstream public directory is included, alongside LICENSE and
UPSTREAM-README.md. Gears is copyright Cort Wee / A Posteriori and contributors,
licensed under GPL-3.0. See LICENSE and individual asset notices for terms.
This is Gears, not an original SpikeSim implementation or official LEGO software.

Local modifications: an offline content security policy and a local integration
script/style provide a side-by-side Blocks/Python and Simulator layout. The
student.html/student.js/student.css entry embeds the 3D view in SpikeSim's own
block editor. spikesim.py and spike_native.js translate its block-generated
helper calls into Gears motor/sensor operations. Those adapter files are GPL-3.0.
robot-builder.html/world-builder.html and student-builder.js/.css adapt the
upstream component editors into the same application. robots/spikesim-fll.json
defines the local practice robot using Gears components. The original upstream
configurator, world builder, component source and notices remain included.
The original upstream editor remains as source and is not a separate app screen. All
original source, robot templates, worlds, samples, and attribution files remain.
Upstream assets, SCSS, root example projects, and build tools are also retained
in upstream-source/. Root sample projects are additionally exposed through
examples.html. Only the upstream .git history is omitted. The original public/
tree is this directory; the other upstream files can be restored beside it.
The local integration also suppresses the automatic release-news popup; it
remains available through Gears Help.

Gears uses Babylon.js, Ammo.js, Skulpt and virtual EV3/ev3dev/Pybricks devices.
It does not run the SPIKE Prime hub firmware. SpikeSim converts supported SPIKE
word-block projects to its own graph, preserving their port assignments. Original
Gears XML/Python sample programs are retained as source; automatic conversion of
those formats into SpikeSim blocks is not implemented.

The GPL applies to the Gears code; it does not automatically grant rights to
third-party artwork or trademarks. Upstream credits Yuvix25 for FLL models.
No separate license was found for the official FLL mat images in
textures/maps/FLL. These assets were copied locally at the user's request;
permission for public redistribution of those images remains unverified.
Retain all attribution/license files and provide corresponding source with
any GPL-covered distribution. Review third-party asset terms before publishing.
