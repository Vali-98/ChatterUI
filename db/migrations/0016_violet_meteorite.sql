ALTER TABLE `instructs` ADD `system_prompt_format` text DEFAULT '{{system_prefix}}{{system_prompt}}
{{character_desc}}
{{personality}}
{{scenario}}
{{user_desc}}{{system_suffix}}' NOT NULL;