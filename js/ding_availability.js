/**
 * @file ding.availability.js
 * JavaScript behaviours for fetching and displaying availability.
 */

(function($) {

  // Cache of fetched availability information.
  Drupal.DADB = {};

  Drupal.behaviors.dingAvailabilityAttach = {
    attach: function(context, settings) {
      var ids = [];
      var html_ids = [];
      $.each(settings.ding_availability, function(id, entity_ids) {
        $.each(entity_ids, function(index, entity_id) {
          if (Drupal.DADB[entity_id] === undefined) {
            Drupal.DADB[entity_id] = null;
            ids.push(entity_id);
            html_ids.push(id);
          }
        });
      });

      $.each(html_ids, function(index, id) {
        $('#' + id).addClass('pending');
      });

      // Fetch availability.
      if (ids.length > 0) {
        $.getJSON(settings.basePath + settings.pathPrefix + 'ding_availability/' + (settings.ding_availability_mode ? settings.ding_availability_mode: 'items') + '/' + ids.join(','), {}, update);
      }
      else {
        // Apply already fetched availability
        $.each(settings.ding_availability, function(id, entity_ids) {
          updateAvailability(id, ding_status(entity_ids));
        });
      }

      function update(data, textData) {
        $.each(data, function(id, item) {
          // Update cache.
          Drupal.DADB[id] = item;
        });

        $.each(settings.ding_availability, function(id, entity_ids) {
          var status = ding_status(entity_ids);
          if (id.match(/^availability-/)) {
            // Update availability indicators.
            updateAvailability(id, status);
            updateReservation('reservation-' + entity_ids[0], status);
          }
          else {
            // Update holding information.
            updateHoldings(id, entity_ids, status);
          }
        });

        // Trigger custom event, to able external modules bind on it.
        $(document).trigger("materials_status", [data]);
      }

      function updateAvailability(id, status) {
        $('#' + id).removeClass('pending');
        $('#' + id).addClass('processed');

        if (status.raw.available) {
          $('#' + id).addClass('available');
        }
        if (status.raw.reservable) {
          $('#' + id).addClass('reservable');
        }

        if (status.available) {
          $('#' + id).attr('title', Drupal.t('available'));
        }
        else if (status.onloan) {
          $('#' + id).attr('title', Drupal.t('on loan'));
        }
        else if (status.not_reservable) {
          $('#' + id).attr('title', Drupal.t('not reservable'));
        }
        else if (status.unavailable) {
          $('#' + id).attr('title', Drupal.t('unavailable'));
        }
      }

      function updateReservation(id, status) {
        if (status.show_reservation_button) {
          $('#' + id).removeClass('hidden');
        }
      }

      function updateHoldings(id, entity_ids, status) {
        var entity_id = entity_ids.pop();
        if (Drupal.DADB[entity_id] && (Drupal.DADB[entity_id]['holdings'] || Drupal.DADB[entity_id]['holdings_available'])) {
          var holdings;
          var length;

          // Use holdings_available, if set and entity is not a periodical.
          if (Drupal.DADB[entity_id]['holdings_available'] && !Drupal.DADB[entity_id]['is_periodical'] ) {
              holdings = Drupal.DADB[entity_id]['holdings_available'];
              length = holdings.length;
          }
          else {
            holdings = Drupal.DADB[entity_id]['holdings'];
            //holdings is an object - not array
            Object.keys = Object.keys || function(o) {
              var result = [];
              for (var name in o) {
                if (o.hasOwnProperty(name)) {
                  result.push(name);
                }
              }

              return result;
            };

            length = Object.keys(holdings).length;
          }

          // show status for material if total_count is more than zero and html is given.
          if (Drupal.DADB[entity_id].html && Drupal.DADB[entity_id].total_count > 0) {
            $('#' + id).append('<h2>' + Drupal.t('Status for the material') + '</h2>');
            $('#' + id).append(Drupal.DADB[entity_id].html);
            updateAvailability(id, status);
          }
          // if no html is given; this is exceptional situation.
          else if (length > 0) {
            $('#' + id).append('<h2>' + Drupal.t('No holdings available') + '</h2>');
          }
        }
      }

      // Helper method to compute statuses.
      function ding_status(ids) {
        var available = false;
        var reservable = false;
        var show_reservation_button = false;
        $.each(ids, function(index, entity_id) {
          if (Drupal.DADB[entity_id]) {
            available = available || Drupal.DADB[entity_id]['available'];
            reservable = reservable || Drupal.DADB[entity_id]['reservable'];
            show_reservation_button = show_reservation_button || Drupal.DADB[entity_id]['show_reservation_button'];
          }
        });

        return {
          raw: {
            available: available,
            reservable: reservable
          },
          available: available && reservable,
          onloan: !available && reservable,
          not_reservable: available && !reservable,
          unavailable: !available && !reservable,
          show_reservation_button: show_reservation_button
        };
      };

    }
  };

})(jQuery);
