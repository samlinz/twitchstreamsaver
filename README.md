# Twitch Stream Saver

Userscript (tiny browser extension) that stores the timestamps of Twitch VODs and allows continuing from previous point.

## Why?

If one is watching a long video on demand (VOD) on Twitch and does not finish in
a single sitting, or if it's a long series, it is a pain to hunt for the previously
watched point. This script makes it easy by automatically storing the timestamps
of all watched VODs and allowing the user to continue from the last point with
a single click.

## How does it work

When watching a VOD the script stores the timestamps (and other info like stream name etc.)
periodically into persistent storage. The script is active under https://www.twitch.tv/videos/*.

Under https://www.twitch.tv/* the script adds a context menu option to open a dialog
with an ordered list with VOD info and links to the last stored point.

The stored timestamps are cleared after 30 days of not watching or can be explicitly
removed from the list.

## How to install

The script is written and tested with ViolentMonkey, but should work with other
GreaseMonkey derivatives.

Install by clicking "Install from URL" in VM dash and pointing to the raw JS file, or by copying and pasting the
code into a new file under VM.
