# Custom Templates

This is a guide to adding custom API templates to ChatterUI.

// TODO: Complete Documentation

Valid Sampler Fields:

| Name                       |         Key          |         Macro          |
| :------------------------- | :------------------: | :--------------------: |
| Max Context                |      max_length      | {{max_context_length}} |
| Streaming                  |      streaming       |       {{stream}}       |
| Generated Tokens           |        genamt        |  {{generted_length}}   |
| Temperature                |         temp         |        {{temp}}        |
| Dynamic Temperature Range  |    dynatemp_range    |   {{dynatemp_range}}   |
| Min P                      |        min_p         |       {{min_p}}        |
| XTC Probability            |   xtc_probability    |       {{xtc_p}}        |
| XTC Threshold              |    xtc_threshold     |       {{xtc_t}}        |
| Top P                      |        top_p         |       {{top_p}}        |
| Top A                      |        top_a         |       {{top_a}}        |
| Top K                      |        top_k         |       {{top_k}}        |
| Repetition Penalty         |       rep_pen        |      {{rep_pen}}       |
| Repetition Penalty Range   |    rep_pen_range     |   {{rep_pen_range}}    |
| Repetition Penalty Slope   |    rep_pen_slope     |   {{rep_pen_slope}}    |
| Encoder Repetition Penalty |   encoder_rep_pen    |    {{enc_rep_pen}}     |
| Frequency Penalty          |       freq_pen       |      {{freq_pen}}      |
| Presence Penalty           |     presence_pen     |      {{pres_pen}}      |
| No Repeat Ngram Size       | no_repeat_ngram_size | {{nrepeat_ngram_size}} |
| Minimum Length             |      min_length      |     {{min_length}}     |
| Smoothing Factor           |   smoothing_factor   |   {{smooth_factor}}    |
| Typical Sampling           |       typical        |        {{typ}}         |
| Tail-Free Sampling         |         tfs          |        {{tfs}}         |
| Epsilon Cutoff             |    epsilon_cutoff    |     {{eps_cutoff}}     |
| Eta Cutoff                 |      eta_cutoff      |     {{eta_cutoff}}     |
| Mirostat Mode              |    mirostat_mode     |     {{miro_mode}}      |
| Mirostat Tau               |     mirostat_tau     |      {{miro_tau}}      |
| Mirostat Eta               |     mirostat_eta     |      {{miro_eta}}      |
| Ban EOS tokens             |    ban_eos_token     |      {{ban_eos}}       |
| Add BOS Token              |    add_bos_token     |      {{add_bos}}       |
| Do Sample                  |      do_sample       |     {{do_sample}}      |
| Skip Special Token         | skip_special_tokens  |    {{skip_special}}    |
| Single Line                |     single_line      |    {{single_line}}     |
| Grammar                    |    grammar_string    |      {{grammar}}       |
| Seed                       |         seed         |        {{seed}}        |
| Banned Tokens              |    banned_tokens     |   {{banned_tokens}}    |
| CFG Scale                  |    guidance_scale    |   {{guidance_scale}}   |
| Negative Prompt            |   negative_prompt    |  {{negative_prompt}}   |
| Number of Beams            |      num_beams       |     {{num_beams}}      |
| Early Stopping             |    early_stopping    |   {{early_stopping}}   |
| Length Penalty             |    length_penalty    |     {{length_pen}}     |
| Penalty Alpha              |    penalty_alpha     |     {{alpha_pen}}      |
| Dry Multiplier             |    dry_multiplier    |      {{dry_mult}}      |
| Dry Base                   |       dry_base       |      {{dry_base}}      |
| Dry Allowed Length         |  dry_allowed_length  |     {{dry_length}}     |
| Dry Sequence Break         |  dry_sequence_break  |     {{dry_break}}      |
| Dry Penalty Last N         |  dry_penalty_last_n  | {{dry_penalty_last_n}} |
